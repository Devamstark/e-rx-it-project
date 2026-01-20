# DevXHub "Stitch" Design System Guide

## Overview
This document outlines the **Stitch / Material 3** inspired design system for the E-Rx Hub. The goal is to create a clean, modern, and accessible interface that feels premium and responsive.

**"Stitching"** in this context refers to assembling atomic components (buttons, inputs, cards) into seamless, consistent workflows using a unified set of design tokens.

---

## 1. Core Principles (Material 3)

### A. Design Tokens
We do not use hardcoded hex values (e.g., `#6750a4`) in our components. Instead, we use **Semantic Variables**.

| Token Name | Role | Example Color |
|------------|------|---------------|
| `primary` | Main actions (Buttons, Active States) | Violet/Indigo |
| `surface` | Background of the page | Light Grey/White |
| `surface-container` | Cards, Sidebars, Modals | White/Tinted Grey |
| `on-surface` | Text color on top of surface | Dark Grey/Black |
| `outline` | Borders and dividers | Light Slate |

**Why?** This allows us to support Dark Mode easily in the future just by changing the token values in CSS, without touching any React code.

### B. Elevation & Depth
We use **Elevation** to show hierarchy.
*   **Level 0**: Background (Flat)
*   **Level 1**: Cards (Slight shadow, readable on background)
*   **Level 2**: Hovered Cards / Dropdowns
*   **Level 3**: Modals / Dialogs (High contrast shadow)

### C. The Layout "Shell"
The application is wrapped in a **Shell** that provides:
1.  **Navigation Rail/Sidebar**: Collapsible navigation on the left.
2.  **Top App Bar**: Context, Search, and User Profile on top.
3.  **Main Content**: Area for the specific page.

---

## 2. How to Design New Screens ("Stitch Workflow")

When you want to add a new feature (e.g., "Lab Reports"), follow this **Stitch Workflow**:

### Step 1: Define the Structure
Don't start coding `<div>`. Start by identifying the **Layout Pattern**.
*   Is it a **List View**? (e.g., List of Prescriptions) -> Use `DataGrid` or `CardList`.
*   Is it a **Detail View**? (e.g., Viewing one Patient) -> Use `DetailLayout`.
*   Is it a **Form**? -> Use `FormContainer`.

### Step 2: Assemble Atoms (Low Level)
Use the pre-built atomic components in `components/ui/design-system/`.
*   **Do NOT** use: `<button className="bg-blue-500 ...">`
*   **DO** use: `<Button variant="primary">Save</Button>`

### Step 3: Stitch into Molecules (Mid Level)
Combine atoms into a logical group.
*   *Example*: A "Patient Card" is stitched from: `Card` + `Avatar` + `Typography` + `Button`.

### Step 4: Page Assembly
Place your molecules into the `AppShell`.

---

## 3. Directory Structure

We are migrating to this structure to separate **UI** from **Logic**.

```
components/
├── ui/
│   ├── design-system/       # atomic components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Badge.tsx
│   ├── AppShell.tsx         # Main Layout
│   └── Sidebar.tsx          # Navigation
├── doctor/                  # Business Logic Components
├── pharmacy/
└── ...
```

---

## 4. Typography Scale

We use the standard **Inter** font family with strict weights.

*   **Display Large**: `text-4xl font-bold` (Marketing, Landing)
*   **Headline Medium**: `text-2xl font-semibold` (Page Titles)
*   **Title Small**: `text-base font-medium` (Card Titles)
*   **Body Medium**: `text-sm font-normal` (Standard Text)
*   **Label Small**: `text-xs font-bold uppercase` (Buttons, Captions)

---

## 5. CSS Reference (Tailwind 4)

We have extended Tailwind in `index.css` with these classes:

*   `.m3-card`: Standard card style with hover lift.
*   `.text-on-surface`: Standard readable text.
*   `.bg-surface-container`: Standard background for containers.

---

**Next Steps:**
1. Review the `index.css` for the new theme variables.
2. Check `components/ui/AppShell.tsx` to see the new layout in action.
