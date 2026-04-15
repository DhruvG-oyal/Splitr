import { Bell, CreditCard, PieChart, Receipt, Users } from "lucide-react";

export const FEATURES = [
  { title: "Group Expenses", Icon: Users, bg: "bg-green-100", color: "text-green-600", description: "Create groups for roommates, trips, or events to keep expenses organized." },
  { title: "Smart Settlements", Icon: CreditCard, bg: "bg-teal-100", color: "text-teal-600", description: "Our algorithm minimises the number of payments when settling up." },
  { title: "Expense Analytics", Icon: PieChart, bg: "bg-green-100", color: "text-green-600", description: "Track spending patterns and discover insights about your shared costs." },
  { title: "Payment Reminders", Icon: Bell, bg: "bg-amber-100", color: "text-amber-600", description: "Automated reminders for pending debts and insights on spending patterns." },
  { title: "Multiple Split Types", Icon: Receipt, bg: "bg-green-100", color: "text-green-600", description: "Split equally, by percentage, or by exact amounts to fit any scenario." },
  { title: "AI Spending Insights", Icon: PieChart, bg: "bg-teal-100", color: "text-teal-600", description: "Get personalized AI-powered spending analysis and recommendations monthly." },
];

export const STEPS = [
  { label: "1", title: "Create or Join a Group", description: "Start a group for your roommates, trip, or event and invite friends." },
  { label: "2", title: "Add Expenses", description: "Record who paid and how the bill should be split amongst members." },
  { label: "3", title: "Settle Up", description: "View who owes what and log payments when debts are cleared." },
];

export const TESTIMONIALS = [
  { quote: "Ye babu rao ka style hai! With Splitr, I finally stopped getting confused about who paid for what!", name: "Babu Rao", image: "/testimonials/babubhaiya.png", role: "Rental Property Manager" },
  { quote: "Splitr's calculations are so accurate, they're even better than my scheme to double money in 25 days!", name: "Raju", image: "/testimonials/raju.jpg", role: "Stock Market Expert" },
  { quote: "If that I have Splitr, Raju wont get away with selling my shoes and coat! I'll add to his debt!", name: "Shyam", image: "/testimonials/shyam.png", role: "Job Searcher" },
];
