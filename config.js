// Configuration File for Home Field Preparatory School Fees System

// Google Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwU9qtOn56ELFI24GnluLYtx6b6Wj5Ihulcd8i57jYosSB8YppdzwYwuCXyuLEiTwXO/exec';

// School Information
const SCHOOL_INFO = {
    name: 'HOME FIELD PREPARATORY SCHOOL',
    address: 'P.O. Box KT 123, Kumasi, Ghana',
    phone: '+233 24 123 4567',
    email: 'info@homefieldprep.edu.gh',
    motto: 'Excellence in Basic Education'
};

// Class List (Must match Google Sheets)
const CLASSES = [
    'Crèche',
    'Nursery 1',
    'Nursery 2',
    'Kindergarten 1',
    'Kindergarten 2',
    'Basic 1',
    'Basic 2',
    'Basic 3',
    'Basic 4',
    'Basic 5',
    'Basic 6',
    'JHS 1',
    'JHS 2',
    'JHS 3'
];

// Academic Terms
const ACADEMIC_TERMS = ['Term 1', 'Term 2', 'Term 3'];

// Academic Years (Next 5 years)
const ACADEMIC_YEARS = ['2024', '2025', '2026', '2027', '2028'];

// Payment Methods
const PAYMENT_METHODS = ['Cash', 'MoMo', 'Bank', 'Cheque'];

// Current User (Can be extended for multi-user)
const CURRENT_USER = {
    name: 'Administrator',
    role: 'School Bursar',
    id: 'USER001'
};

// System Settings
const SETTINGS = {
    currency: 'GHS',
    currencySymbol: '₵',
    dateFormat: 'dd/mm/yyyy',
    timeFormat: '12h',
    autoGenerateReceipt: true,
    receiptPrefix: 'HFPS-RCPT-',
    requireConfirmation: true
};

// Initialize date
function getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatCurrency(amount) {
    return `${SETTINGS.currencySymbol} ${parseFloat(amount).toFixed(2)}`;
}

// API Functions
async function callAPI(method, params = {}) {
    const url = new URL(SCRIPT_URL);
    url.searchParams.append('method', method);
    
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
            url.searchParams.append(key, params[key]);
        }
    });
    
    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'no-cors' // Note: Google Apps Script requires no-cors mode
        });
        
        // For no-cors mode, we can't read the response directly
        // In a real implementation, you'd use doPost and handle CORS properly
        // This is a simplified version for the prototype
        
        // For demonstration, we'll return mock data
        return await mockAPI(method, params);
        
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error. Please check your connection.' };
    }
}

// Mock API for demonstration
// In production, replace with actual Google Apps Script calls
async function mockAPI(method, params) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock data storage
    const mockData = {
        students: JSON.parse(localStorage.getItem('mockStudents')) || [],
        fees: JSON.parse(localStorage.getItem('mockFees')) || [],
        payments: JSON.parse(localStorage.getItem('mockPayments')) || [],
        receipts: JSON.parse(localStorage.getItem('mockReceipts')) || []
    };
    
    switch(method) {
        case 'getStudents':
            let students = mockData.students;
            
            // Apply filters
            if (params.classFilter && params.classFilter !== 'all') {
                students = students.filter(s => s.Class === params.classFilter);
            }
            
            if (params.searchTerm) {
                const term = params.searchTerm.toLowerCase();
                students = students.filter(s => 
                    s.Full_Name.toLowerCase().includes(term) || 
                    s.Student_ID.toLowerCase().includes(term)
                );
            }
            
            return { success: true, students: students };
            
        case 'addStudent':
            const studentId = 'HFPS-' + 
                new Date().getFullYear().toString().substr(-2) + 
                ('0' + (new Date().getMonth() + 1)).slice(-2) + 
                ('0' + new Date().getDate()).slice(-2) + 
                '-' + 
                Math.floor(1000 + Math.random() * 9000);
            
            const newStudent = {
                Student_ID: studentId,
                Full_Name: params.fullName,
                Gender: params.gender,
                Class: params.class,
                Academic_Term: params.term,
                Academic_Year: params.year,
                Date_Created: new Date().toISOString(),
                Status: 'Active'
            };
            
            mockData.students.push(newStudent);
            localStorage.setItem('mockStudents', JSON.stringify(mockData.students));
            
            return { 
                success: true, 
                studentId: studentId, 
                message: 'Student added successfully' 
            };
            
        case 'getFees':
            const fee = mockData.fees.find(f => 
                f.Class === params.class && 
                f.Term === params.term && 
                f.Year === params.year
            );
            
            if (fee) {
                return {
                    success: true,
                    class: fee.Class,
                    term: fee.Term,
                    year: fee.Year,
                    dailyFee: fee.Daily_Fee,
                    termFee: fee.Term_Fee
                };
            } else {
                // Default fees based on class
                const defaultFees = {
                    'Crèche': { daily: 5, term: 300 },
                    'Nursery 1': { daily: 6, term: 350 },
                    'Nursery 2': { daily: 7, term: 400 },
                    'Kindergarten 1': { daily: 8, term: 450 },
                    'Kindergarten 2': { daily: 9, term: 500 },
                    'Basic 1': { daily: 10, term: 550 },
                    'Basic 2': { daily: 11, term: 600 },
                    'Basic 3': { daily: 12, term: 650 },
                    'Basic 4': { daily: 13, term: 700 },
                    'Basic 5': { daily: 14, term: 750 },
                    'Basic 6': { daily: 15, term: 800 },
                    'JHS 1': { daily: 16, term: 850 },
                    'JHS 2': { daily: 17, term: 900 },
                    'JHS 3': { daily: 18, term: 950 }
                };
                
                const defaults = defaultFees[params.class] || { daily: 0, term: 0 };
                
                return {
                    success: true,
                    class: params.class,
                    term: params.term,
                    year: params.year,
                    dailyFee: defaults.daily,
                    termFee: defaults.term
                };
            }
            
        case 'recordPayment':
            const receiptNumber = 'RCPT-' + 
                new Date().getFullYear() + 
                ('0' + (new Date().getMonth() + 1)).slice(-2) + 
                ('0' + new Date().getDate()).slice(-2) + 
                '-' + 
                Math.floor(10000 + Math.random() * 90000);
            
            const payment = {
                Payment_ID: 'PAY-' + Date.now(),
                Student_ID: params.studentId,
                Student_Name: params.studentName,
                Class: params.class,
                Amount_Paid: parseFloat(params.amount),
                Payment_Date: new Date().toISOString(),
                Payment_Method: params.paymentMethod,
                Receiver: params.receiver,
                Receipt_Number: receiptNumber,
                Balance_Remaining: 0 // Will be calculated
            };
            
            // Calculate balance
            const studentPayments = mockData.payments.filter(p => p.Student_ID === params.studentId);
            const totalPaid = studentPayments.reduce((sum, p) => sum + p.Amount_Paid, 0) + payment.Amount_Paid;
            
            // Get term fee
            const feeResult = await mockAPI('getFees', { 
                class: params.class, 
                term: 'Term 1', 
                year: '2024' 
            });
            
            const balance = feeResult.termFee - totalPaid;
            payment.Balance_Remaining = balance;
            
            mockData.payments.push(payment);
            localStorage.setItem('mockPayments', JSON.stringify(mockData.payments));
            
            // Create receipt
            const receipt = {
                Receipt_Number: receiptNumber,
                Student_ID: params.studentId,
                Student_Name: params.studentName,
                Class: params.class,
                Amount_Paid: payment.Amount_Paid,
                Payment_Date: payment.Payment_Date,
                Payment_Method: payment.Payment_Method,
                Receiver: payment.Receiver,
                Previous_Balance: totalPaid - payment.Amount_Paid,
                New_Balance: balance,
                Term: 'Term 1',
                Academic_Year: '2024'
            };
            
            mockData.receipts.push(receipt);
            localStorage.setItem('mockReceipts', JSON.stringify(mockData.receipts));
            
            return {
                success: true,
                receiptNumber: receiptNumber,
                balanceRemaining: balance,
                message: 'Payment recorded successfully'
            };
            
        case 'getDashboard':
            const dashboardData = {
                totalStudents: mockData.students.length,
                todayCollection: mockData.payments
                    .filter(p => new Date(p.Payment_Date).toDateString() === new Date().toDateString())
                    .reduce((sum, p) => sum + p.Amount_Paid, 0),
                todayPayments: mockData.payments
                    .filter(p => new Date(p.Payment_Date).toDateString() === new Date().toDateString())
                    .length,
                totalCollected: mockData.payments.reduce((sum, p) => sum + p.Amount_Paid, 0),
                totalOutstanding: 0 // Simplified calculation
            };
            
            return { success: true, dashboard: dashboardData };
            
        default:
            return { success: false, message: 'Method not implemented in mock API' };
    }
}