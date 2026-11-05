# Day 2 – AI Development Log

**Project:** PGfy Sales CRM & Call Tracking  
**Development Day:** Day 2  
**Date:** 05 November 2026

## 1. AI Tools Used

- **ChatGPT:** Used for understanding requirements, backend logic guidance, API integration, debugging, dummy data generation guidance, and report generation logic.
- **Claude:** Used for designing and developing the Sales Executive Panel, React components, dashboard layouts, tables, forms, and UI improvements.

## 2. Tasks Performed with AI Assistance

### Task 1: Sales Executive Panel Development

**AI Tool Used:** Claude

**Task Given to AI:**

Design and develop a responsive Sales Executive Panel for the PGfy Sales CRM application using React.js, TypeScript, and Tailwind CSS.

**AI-Generated Output Used:**
- Sales Executive dashboard layout.
- Sidebar navigation and header components.
- Summary cards for assigned leads and sales activities.
- Assigned leads table.
- Lead details and interaction interfaces.
- Reusable React components.

**Changes Made:**
Customized the generated components according to the assignment requirements and maintained consistency with the Admin Panel design.

**Verification:**
Checked the Sales Executive Panel layout, navigation, component rendering, and responsiveness.

### Task 2: Dummy Data Creation and Database Seeding

**AI Tool Used:** ChatGPT

**Task Given to AI:**

Generate fictional customer data for the PGfy Sales CRM application, including customer names, mobile numbers, email addresses, property categories, preferred locations, budgets, lead statuses, and assigned sales executives.

**AI-Generated Output Used:**
- Fictional Indian customer details.
- Bengaluru property locations.
- Different property categories and budget ranges.
- Different lead statuses.
- Sample records for testing the application.

**Changes Made:**
Customized the dummy data according to the database schema and inserted the records into the PostgreSQL database.

**Verification:**
Checked whether the dummy records were successfully stored and retrieved from the database.

### Task 3: Admin Panel Data Fetching and Verification

**AI Tool Used:** ChatGPT

**Task Given to AI:**

Help verify the integration between the Admin Panel frontend, backend APIs, and PostgreSQL database. Check whether the Admin Panel correctly fetches and displays the stored lead data.

**AI-Generated Output Used:**
- API integration guidance.
- Data fetching and response handling suggestions.
- Debugging assistance for API and frontend integration.
- Suggestions for handling loading and error states.

**Changes Made:**
Updated and adjusted API integration wherever required to ensure the Admin Panel displayed the correct database records.

**Verification:**
Checked whether the dummy lead records were successfully fetched from the backend and displayed correctly in the Admin Panel.

### Task 4: Report Generation in Admin Panel

**AI Tool Used:** ChatGPT

**Task Given to AI:**

Implement report generation functionality in the Admin Panel so that the administrator can download sales CRM data in CSV and  Excel format.

**AI-Generated Output Used:**
- Report generation logic.
- Data formatting suggestions.
- CSV and Excel export implementation guidance.
- Download functionality.

**Changes Made:**
Customized the report generation functionality according to the assignment requirements and integrated it into the Admin Panel.

**Verification:**
Tested the report generation and download functionality and checked the exported data.

## 3. Important AI Prompts Used

1. "Design a responsive Sales Executive Dashboard for a Sales CRM application using React, TypeScript, and Tailwind CSS."
2. "Create reusable components for the Sales Executive Panel, including dashboard cards, sidebar, and assigned leads table."
3. "Generate fictional Indian customer lead data with Bengaluru locations, property categories, budgets, and different lead statuses."
4. "Help me verify whether the Admin Panel is correctly fetching lead data from the backend API."
5. "Debug the frontend and backend API integration and ensure database records are displayed correctly."
6. "Implement CSV/Excel report generation functionality in the Admin Panel."

## 4. Changes and Improvements Made to AI-Generated Code

- Customized the Sales Executive Panel according to the project requirements.
- Updated UI components and dashboard layouts.
- Added fictional customer data for testing.
- Verified database records and API responses.
- Improved frontend and backend data integration.
- Implemented report generation and download functionality.
- Reviewed and modified AI-generated code before integration.

## 5. Verification and Testing

The following areas were tested during Day 2:

- Sales Executive Panel rendering and navigation.
- Dashboard and assigned leads interface.
- Dummy data insertion into PostgreSQL.
- Successful data retrieval from the backend.
- Admin Panel data fetching and display.
- Frontend and backend integration.
- Report generation functionality.
- Downloading and checking exported report data.

**Testing Results:** Update this section according to the actual test results.

## 6. Day 2 Outcome

Day 2 focused on completing the Sales Executive Panel, adding fictional customer data, verifying database connectivity and data fetching in the Admin Panel, and implementing report generation functionality.

The Sales Executive Panel was developed to provide a dedicated interface for sales executives to work with their assigned leads.

Dummy records were added to the database to test the application with sample customer enquiries. The Admin Panel was also checked to verify that the stored data was being fetched and displayed correctly.

Report generation functionality was implemented in the Admin Panel to allow administrators to download CRM data.

## 7. Challenges and Learnings

- Designing a separate interface for the Sales Executive role.
- Managing dummy data according to the database schema.
- Verifying API responses and database records.
- Debugging frontend and backend integration issues.
- Implementing data export and report generation.
- Understanding how different user roles interact with the same CRM system.

**Note:** AI tools were used as development assistance. Generated code was reviewed, modified, and tested before being integrated into the final application.