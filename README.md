# SmartSpend User Guide 💰

Welcome to SmartSpend! This guide will help you get started with tracking your finances, managing budgets, and linking with your partner.

## 🚀 Getting Started

### 1. Account Creation
- Open the application.
- Click **"Sign Up"**.
- Enter your email and a secure password.
- You will be automatically logged in and directed to your personal dashboard.

### 2. Your Dashboard
The dashboard is your financial command center. Here you can see:
- **Summary Cards**: Quick view of total expenses, income, and balance.
- **Spending Chart**: Visual breakdown of your expenses by category.
- **Recent Transactions**: List of your latest financial activities.

## � Key Features

### 📊 tracking Expenses & Income
**Adding a Transaction:**
1. Click the **"Add Expense"** or **"Add Income"** button (or the `+` icon on mobile).
2. Fill in the details:
   - **Description**: What was it? (e.g., "Grocery Shopping")
   - **Amount**: How much?
   - **Category**: Select from the list (e.g., Food, Housing).
   - **Date**: Defaults to today, but can be backdated.
3. **Recurring Items**: For bills or salary, select a frequency (e.g., "Monthly") to have SmartSpend automatically track them for you.

### � Partner Linking (Couples Mode)
SmartSpend allows you to view your partner's finances alongside yours.

**How to Link:**
1. Go to **Settings** → **Partner Connection**.
2. **Share your Connection ID** with your partner.
3. Ask your partner for their Connection ID.
4. Enter their ID in the "Partner Connection ID" box and click **Link Partner**.
5. **Important**: Your partner must also enter *your* ID on their account to complete the secure handshake.
6. Once linked, a **Profile Switcher** will appear in the top header, allowing you to toggle between your view and theirs.

### 📉 Offline Mode
Going somewhere with spotty internet? No problem!
- SmartSpend works **Offline**.
- You can add expenses while disconnected.
- Data is saved locally and automatically syncs to the cloud once you're back online.
- Look for the "Offline" indicator in the Quick Add menu.

## 🛠️ For Developers (Installation)

If you are setting up this project locally:

1. **Clone & Install**:
   ```bash
   git clone https://github.com/yourusername/smartspend.git
   cd smartspend
   npm install
   ```
2. **Environment**:
   - Copy `.env.example` to `.env.local`
   - Fill in your Firebase config keys.
3. **Run**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:9002](http://localhost:9002).

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.
