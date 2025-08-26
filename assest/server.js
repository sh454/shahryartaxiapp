const express = require('express');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const stripe = Stripe('YOUR_STRIPE_SECRET_KEY');

app.use(cors());
app.use(express.json());

// Nodemailer yapılandırması
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_GMAIL_ADDRESS',
        pass: 'YOUR_GMAIL_APP_PASSWORD'
    }
});

// Ücret oranları
const ratesFile = path.join(__dirname, 'rates.json');
let rates = { baseFare: 5, standard: 1.5, executive: 2.0, luxury: 2.5, minivan: 3.0 };
if (fs.existsSync(ratesFile)) {
    rates = JSON.parse(fs.readFileSync(ratesFile, 'utf8'));
}

// Rezervasyonları sakla
const bookingsFile = path.join(__dirname, 'bookings.json');
let bookings = [];
if (fs.existsSync(bookingsFile)) {
    bookings = JSON.parse(fs.readFileSync(bookingsFile, 'utf8'));
}

// Rezervasyon endpoint'i
app.post('/bookings', async (req, res) => {
    try {
        const booking = req.body;
        bookings.push(booking);
        fs.writeFileSync(bookingsFile, JSON.stringify(bookings));

        const mailOptions = {
            from: 'YOUR_GMAIL_ADDRESS',
            to: 'ADMIN_EMAIL_ADDRESS',
            subject: 'New Booking Notification',
            html: `
                <h2>New Booking Received</h2>
                <p><strong>Name:</strong> ${booking.name}</p>
                <p><strong>Phone:</strong> ${booking.phone}</p>
                <p><strong>Email:</strong> ${booking.email}</p>
                <p><strong>Pickup Location:</strong> ${booking.pickup}</p>
                <p><strong>Destination:</strong> ${booking.destination}</p>
                <p><strong>Date & Time:</strong> ${booking.date} at ${booking.time}</p>
                <p><strong>Vehicle Type:</strong> ${booking.vehicle}</p>
                <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
                <p><strong>Estimated Fare:</strong> ${booking.estimatedFare}</p>
                <p><strong>Booking Time:</strong> ${new Date(booking.timestamp).toLocaleString()}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Booking received and admin notified' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to process booking' });
    }
});

// Rezervasyonları getir
app.get('/bookings', (req, res) => res.json(bookings));

// Stripe Payment Intent
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency } = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method_types: ['card']
        });
        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Oranları getir
app.get('/rates', (req, res) => res.json(rates));

// Oranları güncelle
app.post('/update-rates', (req, res) => {
    try {
        rates = req.body;
        fs.writeFileSync(ratesFile, JSON.stringify(rates));
        res.json({ message: 'Rates updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update rates' });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));