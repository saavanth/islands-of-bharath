import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "path";
import bodyParser from "body-parser";
import { fileURLToPath } from 'url';
import open from 'open';
import axios from "axios";
import { spawn } from 'child_process';
import RSSParser from 'rss-parser';
import mongoose from 'mongoose';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5502;
const STREAMLIT_PORT = 8501;

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors());
app.use(express.json());

// Start Streamlit dashboard as subprocess
let streamlitProcess = null;

function startStreamlitDashboard() {
  console.log('Starting Streamlit dashboard...');
  streamlitProcess = spawn('streamlit', ['run', 'dashboard.py', '--server.port', STREAMLIT_PORT.toString(), '--server.headless', 'true', '--server.enableCORS', 'false', '--server.enableXsrfProtection', 'false']);
  
  streamlitProcess.stdout.on('data', (data) => {
    console.log(`Streamlit: ${data}`);
  });
  
  streamlitProcess.stderr.on('data', (data) => {
    console.log(`Streamlit Error: ${data}`);
  });
  
  streamlitProcess.on('close', (code) => {
    console.log(`Streamlit process exited with code ${code}`);
  });
  
  streamlitProcess.on('error', (err) => {
    console.error('Failed to start Streamlit:', err);
  });
}

// Dashboard route - redirect to Streamlit
app.get('/dashboard', (req, res) => {
  // Get the host from the request to handle both localhost and 127.0.0.1
  const host = req.get('host').split(':')[0];
  const dashboardUrl = `http://${host}:${STREAMLIT_PORT}`;
  res.redirect(dashboardUrl);
});

// Dashboard API route for iframe embedding
app.get('/dashboard-embed', (req, res) => {
  // Get the host from the request to handle both localhost and 127.0.0.1
  const host = req.get('host').split(':')[0];
  const dashboardUrl = `http://${host}:${STREAMLIT_PORT}`;
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Indian Islands Dashboard</title>
        <style>
            body { margin: 0; padding: 0; }
            iframe { 
                width: 100%; 
                height: 100vh; 
                border: none; 
            }
        </style>
    </head>
    <body>
        <iframe src="${dashboardUrl}" title="Indian Islands Dashboard"></iframe>
    </body>
    </html>
  `);
});

// Redirect root to landing page
app.get('/', (req, res) => {
  res.redirect('/landing.html');
});

// Nodemailer setup (replace with your Gmail and App Password)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'islands.bharat@gmail.com',
    pass: 'osmrxltwboczqomu'
  }
});

// Helper to send thank you email
function sendThankYouEmail(to, subject, text) {
  return transporter.sendMail({
    from: '"Islands of Bharath" <islands.bharat@gmail.com>',
    to,
    subject,
    text
  });
}

// Enquiry form handler
app.post('/api/enquiry', async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    await sendThankYouEmail(
      email,
      'Thank you for your enquiry!',
      `Dear ${name},\n\nThank you for your enquiry about "${subject}". We have received your message:\n"${message}"\n\nWe will get back to you soon!\n\nIslands of Bharath Team`
    );
    res.redirect('/enquiry-thankyou.html');
  } catch (err) {
    res.status(500).send('Error sending email.');
  }
});

// Review form handler
app.post('/api/review', async (req, res) => {
  const { name, email, island, rating, review } = req.body;
  try {
    await sendThankYouEmail(
      email,
      'Thank you for your review!',
      `Dear ${name},\n\nThank you for reviewing ${island} and giving a rating of ${rating} stars.\nYour review:\n"${review}"\n\nWe appreciate your feedback!\n\nIslands of Bharath Team`
    );
    res.redirect('/review-thankyou.html');
  } catch (err) {
    res.status(500).send('Error sending email.');
  }
});

// Feedback form handler
app.post('/api/feedback', async (req, res) => {
  const { name, email, feedbackType, category, feedback } = req.body;
  try {
    await sendThankYouEmail(
      email,
      'Thank you for your feedback!',
      `Dear ${name},\n\nThank you for your ${feedbackType} on ${category}.\nYour feedback:\n"${feedback}"\n\nWe value your input!\n\nIslands of Bharath Team`
    );
    res.redirect('/feedback-thankyou.html');
  } catch (err) {
    res.status(500).send('Error sending email.');
  }
});

// Chatbot handler
app.post('/chat', async (req, res) => {
  const { prompt } = req.body;

  const finalPrompt = `You are "Sagarika", a friendly and helpful AI travel companion for the "Islands of Bharath" website. Your expertise is the islands of India. Your personality is warm and welcoming.

Follow these rules:
1.  **Greeting:** For greetings like "hi" or "hello", respond warmly and start with "Namaste!". Example: "Namaste! I'm Sagarika. How can I help you plan a trip to our beautiful islands today?"
2.  **Welcome Message:** At the start of the chat, greet the user with "Namaste!" and introduce yourself as Sagarika.
3.  **List Islands:** If asked for a list of islands, provide all known islands for that state/region as a numbered list. Do NOT include any greeting or "Namaste!" in the list answer. Example: "The islands of Kerala are:\n1. Willingdon Island\n2. Vypin Island ..."
4.  **No Islands:** If a state has no islands, respond with: "There are no islands in that particular state."
5.  **Stay on Topic:** If the question is NOT about Indian islands, politely decline. Example: "My expertise is focused on the islands of India. How can I help you with that?"
6.  **Be Concise:** For all other questions, provide a helpful and concise answer, limited to 3 sentences, and do NOT use "Namaste!" unless it is a greeting.

User: ${prompt}
Sagarika:`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const geminiBody = {
      contents: [{ parts: [{ text: finalPrompt }] }]
    };

    const response = await axios.post(geminiUrl, geminiBody);

    console.log("Gemini API Raw Response:", JSON.stringify(response.data, null, 2));

    let aiText = "";
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      aiText = response.data.candidates[0].content.parts[0].text.trim();
    }

    if (!aiText) {
      aiText = "I'm sorry, I couldn't find an answer. Please try rephrasing.";
    }

    res.json({ response: aiText });
  } catch (err) {
    console.error("Gemini API error:", err?.response?.data || err.message);
    res.json({ response: "Sorry, there was an issue with the AI service." });
  }
});

// Fallback for 404
app.use((req, res) => {
  res.status(404).send('Page not found.');
});

app.listen(PORT, () => {
  const url = `http://127.0.0.1:${PORT}/landing.html`;
  console.log(`\nServer running at: ${url}`);
  console.log(`Dashboard available at: http://127.0.0.1:${PORT}/dashboard`);
  console.log(`Dashboard embed at: http://127.0.0.1:${PORT}/dashboard-embed`);
  
  // Start Streamlit dashboard
  startStreamlitDashboard();
  
  open(url);
});

const islandKeywords = [
  'island', 'islands', 'Andaman', 'Nicobar', 'Lakshadweep', 'Majuli', 'Sundarbans', 'Divar', 'Diu', 'Elephanta', 'St. Mary', 'Rameswaram', 'Pamban', 'Srirangam', 'Munroe', 'Sagar Island',
  // Riverine islands and related terms
  'river island', 'riverine island', 'delta island', 'sandbar', 'char island', 'Ganga island', 'Brahmaputra island', 'Yamuna island', 'Godavari island', 'Krishna island', 'Mahanadi island', 'Hooghly island', 'Bhutni', 'Umananda', 'Jal Mahadev',
  // Broader context
  'coast', 'archipelago', 'bay', 'tourism', 'ferry', 'port', 'beach', 'marine', 'coral', 'mangrove', 'backwater', 'estuary', 'peninsula', 'harbour', 'harbor', 'jetty', 'cruise', 'flood', 'cyclone', 'tsunami', 'fishing', 'boat', 'bridge', 'resort', 'ecotourism', 'wildlife sanctuary', 'national park', 'UNESCO', 'heritage', 'tribal', 'biodiversity', 'conservation', 'erosion', 'climate change', 'sea level', 'disaster', 'relief', 'evacuation', 'monsoon', 'rainfall', 'weather', 'environment', 'pollution', 'plastic', 'cleanup', 'sustainable', 'renewable', 'solar', 'wind', 'hydro', 'power', 'electricity', 'infrastructure', 'development', 'connectivity', 'airport', 'seaplane', 'navy', 'coast guard', 'security', 'smuggling', 'migration', 'population', 'settlement', 'village', 'community', 'festival', 'culture', 'tradition', 'language', 'education', 'school', 'college', 'university', 'health', 'hospital', 'medical', 'doctor', 'nurse', 'covid', 'pandemic', 'lockdown', 'quarantine', 'vaccination', 'outbreak', 'case', 'death', 'recovery', 'aid', 'ngo', 'volunteer', 'project', 'initiative', 'scheme', 'policy', 'government', 'administration', 'minister', 'prime minister', 'chief minister', 'governor', 'president', 'parliament', 'assembly', 'election', 'vote', 'campaign', 'protest', 'strike', 'law', 'order', 'crime', 'arrest', 'court', 'judgment', 'petition', 'appeal', 'hearing', 'verdict', 'sentence', 'bail', 'warrant', 'investigation', 'probe', 'enquiry', 'report', 'media', 'press', 'journalist', 'editor', 'column', 'opinion', 'analysis', 'feature', 'interview', 'profile', 'story', 'headline', 'breaking', 'exclusive', 'update', 'alert', 'news', 'coverage', 'photo', 'video', 'gallery', 'live', 'stream', 'broadcast', 'telecast', 'radio', 'podcast', 'app', 'website', 'portal', 'platform', 'social media', 'twitter', 'facebook', 'instagram', 'youtube', 'whatsapp', 'telegram', 'sms', 'email', 'message', 'call', 'contact', 'helpline', 'support', 'service', 'facility', 'amenity', 'utility', 'supply', 'distribution', 'transport', 'logistics', 'delivery', 'shipment', 'cargo', 'freight', 'export', 'import', 'trade', 'commerce', 'business', 'industry', 'market', 'economy', 'finance', 'bank', 'atm', 'currency', 'rupee', 'dollar', 'euro', 'pound', 'yen', 'yuan', 'gold', 'silver', 'stock', 'share', 'bond', 'mutual fund', 'insurance', 'investment', 'loan', 'credit', 'debit', 'payment', 'transaction', 'account', 'tax', 'gst', 'customs', 'duty', 'fee', 'charge', 'fine', 'penalty', 'refund', 'compensation', 'claim', 'settlement', 'dispute', 'agreement', 'contract', 'deal', 'partnership', 'collaboration', 'joint venture', 'merger', 'acquisition', 'startup', 'entrepreneur', 'innovation', 'technology', 'science', 'research', 'study', 'survey', 'census', 'data', 'statistic', 'figure', 'record', 'document', 'file', 'paper', 'book', 'magazine', 'journal', 'publication', 'release', 'announcement', 'statement', 'declaration', 'notice', 'notification', 'circular', 'memo', 'letter', 'order', 'instruction', 'direction', 'guideline', 'advisory', 'warning', 'precaution', 'measure', 'step', 'action', 'initiative', 'plan', 'proposal', 'project', 'scheme', 'mission', 'vision', 'goal', 'target', 'objective', 'strategy', 'policy', 'decision', 'resolution', 'implementation', 'execution', 'operation', 'activity', 'event', 'function', 'programme', 'campaign', 'drive', 'movement', 'rally', 'march', 'yatra', 'expedition', 'exploration', 'adventure', 'tour', 'trip', 'travel', 'journey', 'visit', 'stay', 'accommodation', 'booking', 'reservation', 'ticket', 'pass', 'permit', 'license', 'approval', 'clearance', 'sanction', 'authorization', 'consent'
];
const parser = new RSSParser();

const googleNewsIslandFeeds = [
  'https://news.google.com/rss/search?q=Andaman+island+India',
  'https://news.google.com/rss/search?q=Nicobar+island+India',
  'https://news.google.com/rss/search?q=Lakshadweep+island+India',
  'https://news.google.com/rss/search?q=Majuli+island+India',
  'https://news.google.com/rss/search?q=Sundarbans+island+India',
  'https://news.google.com/rss/search?q=Divar+island+India',
  'https://news.google.com/rss/search?q=Diu+island+India',
  'https://news.google.com/rss/search?q=Elephanta+island+India',
  'https://news.google.com/rss/search?q=St.+Mary+island+India',
  'https://news.google.com/rss/search?q=Rameswaram+island+India',
  'https://news.google.com/rss/search?q=Pamban+island+India',
  'https://news.google.com/rss/search?q=Srirangam+island+India',
  'https://news.google.com/rss/search?q=Munroe+island+India',
  'https://news.google.com/rss/search?q=Sagar+island+India',
  // Riverine islands:
  'https://news.google.com/rss/search?q=Bhutni+island+India',
  'https://news.google.com/rss/search?q=Umananda+island+India',
  'https://news.google.com/rss/search?q=Jal+Mahadev+island+India',
  'https://news.google.com/rss/search?q=Sandbar+island+India',
  'https://news.google.com/rss/search?q=Char+island+India',
  'https://news.google.com/rss/search?q=Ganga+island+India',
  'https://news.google.com/rss/search?q=Brahmaputra+island+India',
  'https://news.google.com/rss/search?q=Yamuna+island+India',
  'https://news.google.com/rss/search?q=Godavari+island+India',
  'https://news.google.com/rss/search?q=Krishna+island+India',
  'https://news.google.com/rss/search?q=Mahanadi+island+India',
  'https://news.google.com/rss/search?q=Hooghly+island+India'
];

app.get('/api/island-news', async (req, res) => {
  try {
    let allItems = [];
    // Fetch from regular RSS feeds (filter by keywords)
    for (const feedUrl of rssFeeds) {
      const feed = await parser.parseURL(feedUrl);
      allItems = allItems.concat(feed.items.filter(item => {
        const text = (item.title || '') + ' ' + (item.contentSnippet || '') + ' ' + (item.content || '') + ' ' + (item.summary || '');
        return islandKeywords.some(keyword =>
          text.toLowerCase().includes(keyword.toLowerCase())
        );
      }));
    }
    // Fetch from Google News RSS feeds (include all articles)
    for (const feedUrl of googleNewsIslandFeeds) {
      const feed = await parser.parseURL(feedUrl);
      allItems = allItems.concat(feed.items);
    }
    // Add isRecent boolean (news from last 7 days)
    const now = new Date();
    const withRecent = allItems.map(item => {
      const pubDate = new Date(item.pubDate || item.isoDate || item.published || item.date || 0);
      const isRecent = (now - pubDate) / (1000 * 60 * 60 * 24) <= 7;
      return { ...item, isRecent };
    });
    // Sort by pubDate descending
    withRecent.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    // Determine if any news is recent
    const hasRecent = withRecent.some(item => item.isRecent);
    // Always return the most recent 50 articles, regardless of age
    res.json({ articles: withRecent.slice(0, 50), hasRecent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch island news', details: err.message });
  }
});

