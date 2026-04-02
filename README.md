# Salt Profit Share Calculator

A modern, client-side React.js web application for calculating and distributing profits between owners and contractors in the salt production business.

## Features

✨ **Complete Financial Calculator**
- Real-time auto-calculations on input changes
- No submit button required
- Client-side only (no backend needed)

📊 **Comprehensive Breakdown**
- Production details tracking
- Income management (cash & cheques)
- Contractor expense calculation
- Loan tracking for both owners
- Detailed profit distribution

💾 **Data Management**
- Auto-save to browser localStorage
- Reset functionality
- Download calculations as PDF

📱 **Responsive Design**
- Mobile-first approach
- Works on all screen sizes
- Clean, modern UI with Tailwind CSS

## Tech Stack

- **React 18** with Hooks (useState, useEffect, useRef)
- **Vite** for bundling & dev server
- **Tailwind CSS** for styling
- **jsPDF + html2canvas** for PDF export
- **Client-side only** (no backend required)

## Installation & Running

### Prerequisites
- Node.js (v14+)
- npm

### Setup

```bash
# Navigate to project directory
cd salt-profit-share-calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Building for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── App.jsx                  # Main component with state management
├── index.jsx               # React entry point
├── index.css               # Tailwind CSS styles
├── components/
│   ├── InputSection.jsx    # Input form component
│   └── ResultSection.jsx   # Results display component
└── utils/
    └── calculations.jsx    # All calculation logic

public/
└── index.html              # HTML entry point

vite.config.js              # Vite configuration
package.json                # Dependencies & scripts
```

## Usage Guide

### 1. Enter Production Details
- **Salt Packed Bags**: Total bags packed for this batch
- **Deducted Bags**: Bags removed/damaged
- **Price per Bag**: LKR per bag

### 2. Record Income
- **Cash Received**: Direct cash payments
- **Cheque Received**: Cheque payments

### 3. Input Contractor Expenses
- **Packing Fee per Bag**: Cost per packed bag
- **Plastic Bag Cost**: Cost per bag unit
- **Other Expenses**: Any additional expenses

### 4. Add Loans (Optional)
- Toggle "Both owners have loans"
- Enter loan amounts for each owner

### 5. View Results
- See auto-calculated breakdown
- Final shares for each owner
- Download as PDF

## Calculation Logic

### Net Bags
```
net_bags = packed_bags - deducted_bags
```

### Initial Price
```
initial_price = net_bags × price_per_bag
```

### Income & Expenses
```
grand_total_received = cash_received + cheque_received

contractor_total_spent = 
  (packing_fee_per_bag × packed_bags) +
  (bag_cost_per_unit × packed_bags) +
  other_expenses
```

### Shares
```
contractor_share = (initial_price / 2) + contractor_total_spent

owner_pool = grand_total_received - contractor_share

general_share_per_owner = owner_pool / 2

final_inaya = general_share_per_owner - loan_inaya
final_shakira = general_share_per_owner - loan_shakira
```

### Validation
- Ensures: `final_inaya + final_shakira = owner_pool`
- If mismatch: difference is added to person with LOWER loan
- Prevents negative values (shows 0 if negative)

## Features Explained

### Auto-Save
- Calculations are automatically saved to browser localStorage
- Data persists across browser sessions
- Manually accessible via browser dev tools

### PDF Export
- Download complete calculation as PDF
- Includes all inputs and results
- Professional layout

### Reset Button
- Clears all inputs and data
- Removes localStorage entry
- Starts fresh calculation

### Loan Toggle
- Optional feature for loan tracking
- Only appears when enabled
- Can be switched on/off anytime

### Negative Value Highlighting
- Loss/negative values shown in RED
- Warnings displayed for attention
- Helpful for identifying issues

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (v14+)
- Mobile browsers

## Notes for Users

1. **Currency**: All amounts are in LKR (Sri Lankan Rupees)
2. **Precision**: Calculations show 2 decimal places
3. **Formatting**: Currency formatted as "LKR 1,000.00"
4. **Real-time**: Changes calculate instantly
5. **No Internet**: Works completely offline

## Troubleshooting

**App won't start**
- Clear node_modules: `rm -r node_modules`
- Reinstall: `npm install`
- Restart: `npm run dev`

**localStorage full**
- Clear browser cache
- Check browser localStorage quota

**PDF download fails**
- Check pop-up blocker
- Refresh page and try again
- Use latest browser version

## License

Free to use for educational and commercial purposes.

## Support

For issues or feature requests, contact the development team.

---

**Built with ❤️ for the salt production industry**
