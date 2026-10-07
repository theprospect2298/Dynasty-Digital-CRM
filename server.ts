import express, { Request, Response } from 'express';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize server-side Firebase connection
const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {}, firebaseConfig.firestoreDatabaseId);

const DEFAULT_SECRET_KEY = process.env.LEADS_SECRET_KEY || 'dd_secret_leads_2026_cr';

export async function createServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // Parse JSON and form-urlencoded payloads (Zapier, Webhook, Meta forms)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS middleware for web forms and third-party webhook dispatchers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, x-secret-key');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // GET /api/incoming-leads: Documentation & Health Check
  app.get('/api/incoming-leads', (req: Request, res: Response) => {
    res.json({
      status: 'active',
      endpoint: '/api/incoming-leads',
      description: 'Dynasty Digital CRM Incoming Leads Webhook Endpoint',
      auth: {
        method: 'Secret Key Authentication',
        acceptedHeaders: ['x-api-key', 'Authorization: Bearer <KEY>', 'x-secret-key'],
        acceptedBodyFields: ['secretKey', 'apiKey'],
      },
      acceptedFields: {
        name: 'Contact full name (string, e.g. "Jane Doe")',
        email: 'Contact email address (string, e.g. "jane@company.com")',
        phone: 'Phone number (string, e.g. "(954) 555-0123")',
        business: 'Business name (string, e.g. "Luxe Interiors LLC")',
        businessType: 'Business type or industry (string, e.g. "Remodeling/Contractor", "Cleaning", "Landscaping")',
        source: 'Lead source (string, e.g. "Meta Lead Ads", "Website Form", "Google Ads")',
        message: 'Lead inquiry or custom comments (string)',
      },
      actionsTriggered: [
        'Creates new client record with status "Lead" and leadContacted: false',
        'Generates urgent "⚡ Follow up within 5 minutes" task in CRM',
        'Logs timestamped activity entry with lead contact details',
        'Displays real-time notification badge on CRM dashboard and client tab',
      ],
      sampleCurl: `curl -X POST "${req.protocol}://${req.get('host')}/api/incoming-leads" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${DEFAULT_SECRET_KEY}" \\
  -d '{
    "name": "David Miller",
    "email": "david@palmbeachroofs.com",
    "phone": "(561) 555-3819",
    "business": "Palm Beach Roofing Pros",
    "businessType": "Remodeling/Contractor",
    "source": "Meta Lead Ads",
    "message": "Need a high-converting website redesign and Google Ads lead gen for Broward and Palm Beach."
  }'`,
    });
  });

  // POST /api/incoming-leads: Core Ingestion Endpoint
  app.post('/api/incoming-leads', async (req: Request, res: Response) => {
    try {
      // 1. Secret Key Verification
      const authHeader = req.headers.authorization || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
      const xApiKey = (req.headers['x-api-key'] || req.headers['x-secret-key'] || '') as string;
      const bodyKey = (req.body?.secretKey || req.body?.apiKey || '') as string;
      const queryKey = (req.query?.secretKey || req.query?.apiKey || '') as string;

      const providedKey = (bearerToken || xApiKey || bodyKey || queryKey).trim();

      if (!providedKey || providedKey !== DEFAULT_SECRET_KEY) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or missing secret key. Pass your secret key in the x-api-key header, Authorization: Bearer <key>, or body secretKey field.',
        });
        return;
      }

      // 2. Extract and Normalize Lead Attributes
      const b = req.body || {};
      const contactName = (
        b.name ||
        b.contactName ||
        b.fullName ||
        (b.first_name ? `${b.first_name} ${b.last_name || ''}`.trim() : '') ||
        'New Inbound Lead'
      ).trim();

      const businessName = (
        b.business ||
        b.businessName ||
        b.company ||
        b.company_name ||
        `${contactName}'s Business`
      ).trim();

      const email = (b.email || b.email_address || '').trim();
      const phone = (b.phone || b.phone_number || '').trim();
      const rawType = (b.businessType || b.business_type || b.industry || b.type || '').trim();
      const rawSource = (b.source || b.leadSource || b.campaign_source || 'Website Form').trim();
      const message = (b.message || b.notes || b.comments || b.inquiry || '').trim();

      // Normalize Industry
      const industries = [
        'Cleaning',
        'Landscaping',
        'Auto Detailing',
        'Remodeling/Contractor',
        'Pressure Washing',
        'HVAC',
        'Wellness',
        'Restaurant',
        'Retail',
      ];
      const matchedIndustry =
        industries.find((i) => rawType.toLowerCase().includes(i.toLowerCase())) || 'Other';

      // Normalize Lead Source
      const isMeta =
        rawSource.toLowerCase().includes('meta') ||
        rawSource.toLowerCase().includes('facebook') ||
        rawSource.toLowerCase().includes('instagram');
      const normalizedSource = isMeta ? 'Meta Ads' : rawSource || 'Website Form';

      // 3. Generate Timestamps & Unique IDs
      const now = new Date();
      const nowIso = now.toISOString();
      const todayStr = nowIso.split('T')[0];
      const randSuffix = Math.random().toString(36).substring(2, 7);

      const clientId = `cli_lead_${Date.now()}_${randSuffix}`;
      const taskId = `tsk_followup_${Date.now()}_${randSuffix}`;
      const activityId = `act_lead_${Date.now()}_${randSuffix}`;

      // 4. Construct Documents
      const clientDoc = {
        id: clientId,
        businessName,
        contactName,
        email,
        phone,
        website: '',
        address: '',
        city: 'Fort Lauderdale, FL',
        industry: matchedIndustry,
        leadSource: normalizedSource,
        status: 'Lead',
        tags: ['Inbound Lead', normalizedSource],
        dateAdded: todayStr,
        notes: message ? `Lead inquiry: ${message}` : `Inbound lead received from ${normalizedSource}.`,
        accessInfo: '',
        lastActivityDate: nowIso,
        leadContacted: false, // Flag for uncontacted badge
        sourceMessage: message,
      };

      const taskDoc = {
        id: taskId,
        clientId,
        title: `⚡ Follow up within 5 minutes — ${contactName} (${businessName})`,
        dueDate: todayStr,
        priority: 'High',
        done: false,
        type: 'Follow-up',
        autoGenerated: true,
        createdAt: nowIso,
      };

      const activityDoc = {
        id: activityId,
        clientId,
        type: 'lead_received',
        title: `Incoming Lead via ${normalizedSource}`,
        description: `${contactName} (${businessName}) submitted a lead form. Contact: ${phone || 'No phone'} | ${email || 'No email'}${message ? `. Message: "${message}"` : ''}`,
        timestamp: nowIso,
      };

      // 5. Write to Firestore (Pushed via Firestore WebSockets to browser client in real time)
      await setDoc(doc(db, 'clients', clientId), clientDoc);
      await setDoc(doc(db, 'tasks', taskId), taskDoc);
      await setDoc(doc(db, 'activities', activityId), activityDoc);

      // 6. Return Success Response
      res.status(201).json({
        success: true,
        message: 'Lead received and created in Dynasty Digital CRM. Urgent 5-minute follow-up task scheduled.',
        lead: {
          id: clientId,
          businessName,
          contactName,
          email,
          phone,
          industry: matchedIndustry,
          source: normalizedSource,
          status: 'Lead',
          leadContacted: false,
        },
        task: {
          id: taskId,
          title: taskDoc.title,
          priority: 'High',
          dueDate: todayStr,
        },
        activity: {
          id: activityId,
          title: activityDoc.title,
          timestamp: nowIso,
        },
      });
    } catch (err: any) {
      console.error('Error processing incoming lead:', err);
      res.status(500).json({
        error: 'Internal Server Error',
        message: err?.message || 'Failed to process lead',
      });
    }
  });

  // 7. Mount Frontend (Vite Middleware in dev, Static Files in prod)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // 8. Start Listening
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dynasty Digital CRM server running on http://0.0.0.0:${PORT}`);
    console.log(`Incoming Leads Endpoint: http://0.0.0.0:${PORT}/api/incoming-leads`);
  });

  return app;
}

// Start server
createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
