// Purpose: Handles viewing, adding, updating, and deleting catalog items

const express = require('express');
const CatalogItem = require('../models/CatalogItem');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// 1. GET ALL ITEMS (Customers and Admins can access this)
router.get('/', async (req, res) => {
  try {
    // Fetch all items from the database
    const items = await CatalogItem.find();
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching the catalog.' });
  }
});

// 2. GET A SINGLE ITEM (To view details of a specific product/service)
router.get('/:id', async (req, res) => {
  try {
    const item = await CatalogItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found.' });
    }
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while fetching the item.' });
  }
});

// 3. CREATE A NEW ITEM (Protected: Only Admins can access this)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, type, category, price, weightPerItemKg, description, images } = req.body;

    // Create a new catalog item
    const newItem = new CatalogItem({
      name,
      type,
      category,
      price,
      weightPerItemKg: type === 'product' ? weightPerItemKg : undefined, // Only save weight if it's a product
      description,
      images: images || []  // Include images array, default to empty if not provided
    });

    // Save it to the database
    await newItem.save();
    res.status(201).json({ message: 'Item added to catalog successfully!', item: newItem });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while adding the item.' });
  }
});

// ==========================================
// NEW ADMIN POWERS: UPDATE & DELETE
// ==========================================

// 4. UPDATE AN EXISTING ITEM (Protected: Admins only)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, type, category, price, weightPerItemKg, description, images } = req.body;

    const updateData = {
      name,
      type,
      category,
      price,
      description,
      images: images || []
    };

    // Handle the weight logic based on type
    if (type === 'product') {
      updateData.weightPerItemKg = weightPerItemKg;
    } else {
      updateData.weightPerItemKg = undefined; // Clear weight if changed to a service
    }

    const updatedItem = await CatalogItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // Tells MongoDB to return the newly updated document
    );

    if (!updatedItem) return res.status(404).json({ message: 'Item not found.' });
    res.json({ message: 'Item updated successfully!', item: updatedItem });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while updating the item.' });
  }
});

// 5. DELETE AN ITEM (Protected: Admins only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const deletedItem = await CatalogItem.findByIdAndDelete(req.params.id);
    if (!deletedItem) return res.status(404).json({ message: 'Item not found.' });
    
    res.json({ message: 'Item deleted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while deleting the item.' });
  }
});

module.exports = router;


