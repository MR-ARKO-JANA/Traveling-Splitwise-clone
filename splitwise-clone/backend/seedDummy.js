const mongoose = require('mongoose');
const User = require('./models/User');
const Group = require('./models/Group');
const Expense = require('./models/Expense');
require('dotenv').config({ path: 'backend/.env' });

async function seed() {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('Connected for seeding');

    const user = await User.findOne();
    if (!user) {
      console.log('No user found! Please sign up in the UI first.');
      process.exit(1);
    }

    const dummyFriend1 = 'alice@example.com';
    const dummyFriend2 = 'bob@example.com';
    const dummyFriend3 = 'charlie@example.com';

    for (let email of [dummyFriend1, dummyFriend2, dummyFriend3]) {
      if (!(await User.findOne({ email }))) {
        await User.create({
          name: email.split('@')[0].toUpperCase(),
          email,
          password: 'password123',
        });
      }
    }

    const f1 = await User.findOne({ email: dummyFriend1 });
    const f2 = await User.findOne({ email: dummyFriend2 });
    const f3 = await User.findOne({ email: dummyFriend3 });

    const group1 = await Group.create({
      name: 'Goa Trip 🏖️',
      description: 'Weekend getaway',
      members: [user.email, dummyFriend1, dummyFriend2],
      createdBy: user._id,
    });

    const group2 = await Group.create({
      name: 'Roommates 🏠',
      description: 'Apartment expenses',
      members: [user.email, dummyFriend1, dummyFriend3],
      createdBy: user._id,
    });

    await Expense.create({
      description: 'Flight Tickets',
      amount: 15000,
      paidBy: user._id,
      splitWith: [user._id, f1._id, f2._id],
      group: group1._id,
      category: 'transport',
    });
    await Expense.create({
      description: 'Hotel Booking',
      amount: 12000,
      paidBy: f1._id,
      splitWith: [user._id, f1._id, f2._id],
      group: group1._id,
      category: 'accommodation',
    });
    await Expense.create({
      description: "Dinner at Tito's",
      amount: 4500,
      paidBy: user._id,
      splitWith: [user._id, f1._id, f2._id],
      group: group1._id,
      category: 'food',
    });
    await Expense.create({
      description: 'Electricity Bill',
      amount: 2400,
      paidBy: f3._id,
      splitWith: [user._id, f1._id, f3._id],
      group: group2._id,
      category: 'utilities',
    });
    await Expense.create({
      description: 'Groceries',
      amount: 3000,
      paidBy: user._id,
      splitWith: [user._id, f1._id, f3._id],
      group: group2._id,
      category: 'food',
    });

    console.log('✅ Seed complete! Dashboard populated with dummy data.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();
