// Purpose: Handles all AI requests for the app

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');
const CatalogItem = require('../models/CatalogItem'); // NEW: We need this to read the catalog!

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// 1. GENERATE PRODUCT DESCRIPTION (Admin Only)
router.post('/generate-description', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { itemName, itemType } = req.body;
    if (!itemName) return res.status(400).json({ message: 'Please provide an item name first!' });

    const prompt = `You are an expert marketing copywriter for a Kenyan e-commerce and delivery app called Kidza Enterprise Ltd. 
    Write a catchy, engaging, 2-to-3 sentence description for a ${itemType} called "${itemName}". 
    Do not use emojis. Make it sound professional but appealing.`;

    const result = await model.generateContent(prompt);
    res.json({ description: result.response.text().trim() });
  } catch (error) {
    console.error('AI Error:', error);
    res.status(500).json({ message: 'Failed to generate AI description.' });
  }
});

// ==========================================
// 2. SMART SEMANTIC SEARCH (Public)
// ==========================================
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'Search query is required.' });

    const catalog = await CatalogItem.find({}, '_id name description type price');
    
    const catalogData = catalog.map(item => ({
      id: item._id,
      name: item.name,
      description: item.description,
      type: item.type
    }));

    const prompt = `You are a smart shopping assistant for Kidza Enterprise Ltd.
    Here is our current catalog of products and services:
    ${JSON.stringify(catalogData)}

    The user is searching for: "${query}"

    Analyze the user's intent and find the items that best solve their problem or match their search.
    Return ONLY a JSON array containing the string IDs of the recommended items. 
    Example: ["60d5ec...", "60d5eb..."]`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    
    // --- NEW BULLETPROOF PARSING ---
    // Find where the array actually starts and ends, ignoring conversational text
    const startIndex = responseText.indexOf('[');
    const endIndex = responseText.lastIndexOf(']');

    if (startIndex !== -1 && endIndex !== -1) {
      const jsonString = responseText.substring(startIndex, endIndex + 1);
      const recommendedIds = JSON.parse(jsonString);
      res.json({ recommendedIds });
    } else {
      // If the AI genuinely found no matches and didn't return an array
      res.json({ recommendedIds: [] }); 
    }

  } catch (error) {
    console.error('AI Search Error:', error);
    res.status(500).json({ message: 'Failed to perform smart search.' });
  }
});

// ==========================================
// 3. AI CUSTOMER SUPPORT CHATBOT (Public)
// ==========================================
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required.' });

    // 1. Fetch a quick summary of the catalog so the bot knows what you sell!
    const catalog = await CatalogItem.find({}, 'name price type');
    const catalogData = catalog.map(item => `${item.name} (KES ${item.price})`).join(', ');

    // 2. Build the Persona (System Instructions)
    const prompt = `You are a friendly, helpful, and concise customer support agent for an e-commerce and delivery app in Kenya called Kidza Enterprise Ltd. 
    
    Here is our current inventory: ${catalogData}.
    
    RULES:
    1. Keep your answers brief (1-3 sentences maximum).
    2. Be polite and helpful.
    3. If the user asks about an item we sell, tell them the price and encourage them to add it to their cart from the Catalog Page.
    4. If they ask about an item we DO NOT sell, politely apologize and tell them we don't carry that right now.
    5. If they ask about an order status, tell them to check their "Customer Dashboard".
    
    Customer's Message: "${message}"
    
    Your Reply:`;

    // 3. Get the reply
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    res.json({ reply: responseText });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ message: 'I am currently offline. Please try again later!' });
  }
});

module.exports = router;


