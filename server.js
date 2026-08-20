const express = require('express');
const app = express();
const port = 3000;

app.use(express.json()); // For parsing application/json

// --- Product Controller Logic (simplified for demonstration) ---
const products = [
    { id: '1', name: 'Laptop', price: 1200 },
    { id: '2', name: 'Mouse', price: 25 },
    { id: '3', name: 'Keyboard', price: 75 }
];

// Get all products
app.get('/products', (req, res) => {
    res.json(products);
});

// Get a single product by ID
app.get('/products/:id', (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (product) {
        res.json(product);
    } else {
        res.status(404).send('Product not found');
    }
});

// Add a new product
app.post('/products', (req, res) => {
    const newProduct = req.body;
    products.push(newProduct);
    res.status(201).json(newProduct);
});

// Update a product
app.put('/products/:id', (req, res) => {
    const productId = req.params.id;
    const updatedProductData = req.body;
    const index = products.findIndex(p => p.id === productId);

    if (index !== -1) {
        products[index] = { ...products[index], ...updatedProductData };
        res.json(products[index]);
    } else {
        res.status(404).send('Product not found');
    }
});

// Delete a product
app.delete('/products/:id', (req, res) => {
    const productId = req.params.id;
    const index = products.findIndex(p => p.id === productId);

    if (index !== -1) {
        products.splice(index, 1);
        res.status(204).send(); // No content
    } else {
        res.status(404).send('Product not found');
    }
});

app.listen(port, () => {
    console.log(`Product service listening at http://localhost:${port}`);
});