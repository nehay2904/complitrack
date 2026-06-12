const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Compliance = require('./models/Compliance');

dotenv.config();

const compliances = [ {
  "complianceId": "OSH-F1",
  "type": "recurring",
  "act": "OSH Rules 2026",
  "title": "Application for Registration of Establishment / Amendment",
  "detail": "An employer seeking registration for an establishment shall apply electronically in FORM-I containing the particulars of the establishment, accompanied by documents relating to registration of the establishment, proof of identity and address on the Shram Suvidha Portal or Portal as may be designated by the Central Government. Any change in particulars furnished in FORM-I shall be updated within 30 days of such change.",
  "recurrence": "Event-based: Before commencement of operations; within 30 days of any change in particulars",
  "format": "FORM I",
  "dueDate": "Before commencement of operations; within 30 days of any change in particulars",
  "alertDate": "2026-06-12",
  "Signing_Authority": null,
  "status": "Pending",
  "completedDate": null,
  "Submission_Authority": "Registering Officer via Shram Suvidha Portal",
  "clause": "Rule 3(1) [See rule 3(1)]"
}];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    await User.deleteMany({});
    await Compliance.deleteMany({});

    const admin = await User.create({
      name: 'JPL Admin',
      email: 'admin@jplmines.com',
      password: 'Admin@123',
      role: 'admin',
      dept: 'Admin'
    });
    console.log('Admin user created:', admin.email);

    await Compliance.insertMany(compliances);
    console.log(`${compliances.length} compliances seeded`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();