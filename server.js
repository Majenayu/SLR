// server.js
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const cors = require("cors");
const QRCode = require('qrcode'); // Added for server-side QR generation
const crypto = require('crypto'); // For hashing QR data

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://your-render-app.onrender.com' : '*', // Adjust origin for production
  credentials: true
}));
app.use(express.static(__dirname)); // serve html, images (Meal1.jpg etc.)

// ---------- MongoDB Connection ----------
const mongoURI = process.env.MONGODB_URI || "mongodb+srv://SLR:SLR@slr.eldww0q.mongodb.net/mess_db?retryWrites=true&w=majority&appName=SLR&serverSelectionTimeoutMS=10000&connectTimeoutMS=10000";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000
})
    .then(() => {
        console.log("✅ MongoDB Connected Successfully");
        initMeals();
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        console.log("⚠️ Ensure Atlas IP whitelist and connection string are correct.");
        process.exit(1);
    });

// ---------- Schemas ----------
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["student", "producer"], default: "student" },
    orders: [{
        mealName: String,
        price: Number,
        date: { type: Date, default: Date.now },
        paid: { type: Boolean, default: false }
        // _id is auto-generated for subdocs
    }],
    verifiedToday: {
        date: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        meals: [{
            name: String,
            quantity: Number,
            totalPrice: Number
        }]
    },
    ratings: {
        type: Map,
        of: Number,
        default: new Map()
    },
    createdAt: { type: Date, default: Date.now }
});

const mealSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    image: String,
    description: String,
    price: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    totalRatings: { type: Number, default: 0 },
    ratings: [Number],
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", userSchema);
const Meal = mongoose.model("Meal", mealSchema);

// ---------- SSE clients for live rating updates ----------
let ratingClients = [];

// ---------- Initialize sample meals ----------
async function initMeals() {
    try {
        const mealCount = await Meal.countDocuments();
        console.log(`📊 Current meals in database: ${mealCount}`);

        if (mealCount === 0) {
            await Meal.insertMany([
                {
                    name: "Meal 1",
                    image: "Meal1.jpg",
                    description: "Sample Meal 1 - delicious and filling.",
                    price: 100,
                    avgRating: 0,
                    totalRatings: 0,
                    ratings: []
                },
                {
                    name: "Meal 2",
                    image: "Meal2.jpg",
                    description: "Sample Meal 2 - chef's special.",
                    price: 120,
                    avgRating: 0,
                    totalRatings: 0,
                    ratings: []
                }
            ]);
            console.log("✅ Meals initialized successfully!");
        }
    } catch (err) {
        console.error("❌ Error initializing meals:", err.message);
    }
}

// ---------- Broadcast helper ----------
function broadcastRatingUpdate(mealName, avgRating, totalRatings) {
    const message = `data: ${JSON.stringify({ mealName, avgRating, totalRatings })}\n\n`;
    ratingClients.forEach(res => {
        try {
            res.write(message);
        } catch (err) {
            console.error("Error broadcasting to client:", err);
        }
    });
}

// ---------- SSE endpoint for live ratings ----------
app.get("/sse-ratings", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    ratingClients.push(res);
    console.log(`📡 SSE Client connected. Total clients: ${ratingClients.length}`);

    req.on('close', () => {
        ratingClients = ratingClients.filter(client => client !== res);
        console.log(`📡 SSE Client disconnected. Total clients: ${ratingClients.length}`);
    });

    req.on('error', (err) => {
        console.error("SSE Error:", err);
        ratingClients = ratingClients.filter(client => client !== res);
    });
});

// ---------- Auth: Register ----------
app.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!email || !password || !name) {
            return res.json({ success: false, error: "Missing required fields" });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.json({ success: false, error: "duplicate" });

        const hashed = await bcrypt.hash(password, 10);
        await new User({ name, email, password: hashed, role }).save();
        console.log(`👤 New user registered: ${email}`);
        res.json({ success: true, role, email, name });
    } catch (err) {
        console.error("Register error:", err.message);
        res.json({ success: false, error: err.message });
    }
});

// ---------- Auth: Login ----------
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.json({ success: false, error: "Missing email or password" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, error: "Invalid credentials" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.json({ success: false, error: "Invalid credentials" });

        console.log(`✅ User logged in: ${email}`);
        res.json({ success: true, role: user.role, email: user.email, name: user.name });
    } catch (err) {
        console.error("Login error:", err.message);
        res.json({ success: false, error: err.message });
    }
});

// ---------- Get all meals ----------
app.get("/meals", async (req, res) => {
    try {
        const meals = await Meal.find().sort({ createdAt: -1 });
        const mealsWithRating = meals.map(m => {
            const avg = m.ratings.length ? (m.ratings.reduce((a,b)=>a+b,0) / m.ratings.length) : 0;
            return {
                _id: m._id,
                name: m.name,
                image: m.image,
                description: m.description,
                price: m.price,
                avgRating: avg ? Number(avg.toFixed(1)) : 0,
                totalRatings: m.ratings.length
            };
        });
        res.json(mealsWithRating);
    } catch (err) {
        console.error("Error fetching meals:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Get user data (orders & ratings) ----------
app.get("/user/:email", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (user) {
            const ratingsObj = {};
            user.ratings.forEach((value, key) => ratingsObj[key] = value);
            res.json({
                success: true,
                name: user.name,
                email: user.email,
                orders: user.orders || [],
                ratings: ratingsObj
            });
        } else {
            res.json({ success: false, error: "User not found" });
        }
    } catch (err) {
        console.error("Error fetching user:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Book a meal ----------
app.post("/book", async (req, res) => {
    try {
        const { mealName, email, price } = req.body;

        if (!mealName || !email || !price) {
            return res.json({ success: false, error: "Missing required fields" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, error: "User not found" });

        const newOrder = {
            mealName,
            price,
            date: new Date(),
            paid: false
        };
        user.orders.push(newOrder);
        await user.save();

        console.log(`📝 New order: ${email} - ${mealName} for ₹${price}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Error booking meal:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Pay for orders ----------
app.post("/pay", async (req, res) => {
    try {
        const { email } = req.body;
        const now = new Date();
        const todayStr = now.toDateString();

        if (!email) {
            return res.json({ success: false, error: "Missing email" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, error: "User not found" });

        // Mark today's unpaid orders as paid
        const todayUnpaid = user.orders.filter(o => new Date(o.date).toDateString() === todayStr && !o.paid);
        if (todayUnpaid.length === 0) {
            return res.json({ success: false, error: "No unpaid orders today" });
        }

        todayUnpaid.forEach(order => {
            order.paid = true;
        });

        // Prepare QR data
        const qrData = JSON.stringify({
            userEmail: email,
            date: todayStr,
            meals: todayUnpaid.map(order => ({
                name: order.mealName,
                price: order.price,
                date: order.date
            }))
        });

        // Generate QR code
        const qrBase64 = await QRCode.toDataURL(qrData);

        await user.save();
        console.log(`💳 Payment processed for ${email} - ${todayUnpaid.length} orders`);
        res.json({ success: true, qrBase64, qrData });
    } catch (err) {
        console.error("Error processing payment:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Check if verified today ----------
app.post("/check-verified", async (req, res) => {
    try {
        const { userEmail, date } = req.body;
        const user = await User.findOne({ email: userEmail });
        if (!user) return res.json({ verified: false });

        const verifiedToday = user.verifiedToday;
        const isVerified = verifiedToday && verifiedToday.date === date && verifiedToday.verified;
        res.json({ verified: isVerified });
    } catch (err) {
        console.error("Error checking verification:", err.message);
        res.json({ verified: false });
    }
});

// ---------- Verify order ----------
app.post("/verify", async (req, res) => {
    try {
        const { userEmail, date } = req.body;
        const now = new Date();

        if (!userEmail || !date) {
            return res.json({ success: false, error: "Missing userEmail or date" });
        }

        const user = await User.findOne({ email: userEmail });
        if (!user) return res.json({ success: false, error: "User not found" });

        // Get today's paid orders
        const todayPaid = user.orders.filter(o => new Date(o.date).toDateString() === date && o.paid);
        if (todayPaid.length === 0) {
            return res.json({ success: false, error: "No paid orders to verify" });
        }

        // Group meals
        const grouped = todayPaid.reduce((acc, meal) => {
            const name = meal.mealName;
            if (!acc[name]) acc[name] = { quantity: 0, totalPrice: 0 };
            acc[name].quantity++;
            acc[name].totalPrice += meal.price;
            return acc;
        }, {});

        // Update verifiedToday
        user.verifiedToday = {
            date,
            verified: true,
            verifiedAt: now,
            meals: Object.entries(grouped).map(([name, info]) => ({
                name,
                quantity: info.quantity,
                totalPrice: info.totalPrice
            }))
        };

        await user.save();

        console.log(`✅ Order verified for ${userEmail} on ${date}`);
        res.json({ success: true });
    } catch (err) {
        console.error("Error verifying order:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Get pending verifications ----------
app.get("/pending-verifications", async (req, res) => {
    try {
        const { period = 'day' } = req.query;
        const now = new Date();
        let startDate;
        switch (period) {
          case 'day':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          // Add other periods if needed
          default:
            startDate = new Date(0);
        }

        const users = await User.find({ role: 'student' });
        const pending = users.filter(u => {
            const todayStr = startDate.toDateString();
            return u.orders.some(o => new Date(o.date).toDateString() === todayStr && o.paid) &&
                   (!u.verifiedToday || u.verifiedToday.date !== todayStr || !u.verifiedToday.verified);
        }).map(u => {
            const todayPaid = u.orders.filter(o => new Date(o.date).toDateString() === startDate.toDateString() && o.paid);
            const grouped = todayPaid.reduce((acc, meal) => {
                const name = meal.mealName;
                if (!acc[name]) acc[name] = { quantity: 0, totalPrice: 0 };
                acc[name].quantity++;
                acc[name].totalPrice += meal.price;
                return acc;
            }, {});
            return {
                userEmail: u.email,
                userName: u.name,
                meals: Object.entries(grouped).map(([name, info]) => ({
                    name,
                    quantity: info.quantity,
                    totalPrice: info.totalPrice
                }))
            };
        });

        res.json(pending);
    } catch (err) {
        console.error("Error fetching pending:", err.message);
        res.status(500).json([]);
    }
});

// ---------- Cancel a meal order ----------
app.post("/cancel", async (req, res) => {
    try {
        const { orderId, email } = req.body;

        if (!orderId || !email) {
            return res.json({ success: false, error: "Missing orderId or email" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ success: false, error: "User not found" });
        }

        const orderIndex = user.orders.findIndex(o => o._id.toString() === orderId);
        if (orderIndex === -1) {
            return res.json({ success: false, error: "Order not found" });
        }

        const order = user.orders[orderIndex];
        const now = new Date();
        const orderDateStr = order.date.toDateString();
        const todayStr = now.toDateString();
        const currentHour = now.getHours();
        const orderHour = order.date.getHours();

        let canCancel = false;
        let errorMsg = '';

        if (orderDateStr !== todayStr) {
            errorMsg = "Cannot cancel previous day's orders";
        } else if (order.paid) {
            errorMsg = "Cannot cancel paid orders";
        } else if (orderHour < 13) {
            canCancel = currentHour < 13;
            if (!canCancel) errorMsg = "Permanent after 1 PM for morning orders";
        } else {
            canCancel = true;
        }

        if (!canCancel) {
            return res.json({ success: false, error: errorMsg });
        }

        user.orders.splice(orderIndex, 1);
        await user.save();

        console.log(`❌ Order cancelled: ${email} - ${order.mealName} (ID: ${orderId}) at ${now.toLocaleString()}`);
        res.json({ success: true, totalOrders: user.orders.length });
    } catch (err) {
        console.error("Error cancelling order:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Rate a meal ----------
app.post("/rate", async (req, res) => {
    try {
        const { mealName, rating, email } = req.body;

        if (!mealName || typeof rating === 'undefined' || !email) {
            return res.json({ success: false, error: "Missing required fields" });
        }

        const user = await User.findOne({ email });
        if (!user) return res.json({ success: false, error: "User not found" });

        user.ratings.set(mealName, Number(rating));
        await user.save();

        const meal = await Meal.findOne({ name: mealName });
        if (!meal) return res.json({ success: false, error: "Meal not found" });

        meal.ratings.push(Number(rating));
        const avgRating = meal.ratings.length ? (meal.ratings.reduce((a,b)=>a+b,0) / meal.ratings.length) : 0;
        meal.avgRating = Number(avgRating.toFixed(1));
        meal.totalRatings = meal.ratings.length;

        await meal.save();

        broadcastRatingUpdate(mealName, meal.avgRating, meal.totalRatings);

        console.log(`⭐ Rating submitted: ${mealName} - ${rating} stars by ${email}`);
        res.json({ success: true, avgRating: meal.avgRating, totalRatings: meal.totalRatings });
    } catch (err) {
        console.error("Error rating meal:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Get meal details ----------
app.get("/meal/:name", async (req, res) => {
    try {
        const meal = await Meal.findOne({ name: req.params.name });
        if (meal) {
            const avgRating = meal.ratings.length ? (meal.ratings.reduce((a,b)=>a+b,0) / meal.ratings.length) : 0;
            res.json({ 
                success: true, 
                name: meal.name, 
                image: meal.image, 
                description: meal.description, 
                price: meal.price, 
                avgRating: Number(avgRating.toFixed(1)), 
                totalRatings: meal.ratings.length 
            });
        } else {
            res.status(404).json({ success: false, error: "Meal not found" });
        }
    } catch (err) {
        console.error("Error fetching meal:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ---------- Serve dashboards (routes) ----------
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});
app.get("/dashboard1", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard1.html"));
});

// ---------- Producer Stats Endpoint ----------
app.get("/producer/stats", async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const users = await User.find({});
    let allOrders = [];
    let verifiedCount = 0;
    users.forEach(u => {
      allOrders.push(...(u.orders || []));
      if (u.verifiedToday && u.verifiedToday.verified) {
        const todayStr = new Date().toDateString();
        if (u.verifiedToday.date === todayStr) verifiedCount += u.verifiedToday.meals.reduce((sum, m) => sum + m.quantity, 0);
      }
    });

    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    const filteredOrders = allOrders.filter(o => new Date(o.date) >= startDate);

    const total = filteredOrders.length;
    const paid = filteredOrders.filter(o => o.paid).length;
    const unpaid = total - paid;

    const mealCounts = {};
    filteredOrders.forEach(o => {
      mealCounts[o.mealName] = (mealCounts[o.mealName] || 0) + 1;
    });

    res.json({ total, paid, unpaid, meals: mealCounts, verified: verifiedCount });
  } catch (err) {
    console.error("Error fetching producer stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({ success: false, error: "Server error" });
});

// ---------- Start server ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log("📡 Make sure MongoDB Atlas connection is active");
});
