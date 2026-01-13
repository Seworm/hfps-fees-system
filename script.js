// Main JavaScript File for Fees Collection System

// Global Variables
let currentPage = 'dashboard';
let selectedStudent = null;
let selectedReceipt = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initApplication();
});

function initApplication() {
    // Set current date
    document.getElementById('currentDate').textContent = formatDate(new Date());
    
    // Load dashboard data
    loadDashboard();
    
    // Setup navigation
    setupNavigation();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize search functionality
    setupSearch();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.dataset.page;
            loadPage(page);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function loadPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(pageName);
    if (page) {
        page.classList.add('active');
        currentPage = pageName;
        
        // Load page-specific data
        switch(pageName) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'students':
                loadStudents();
                break;
            case 'fees':
                loadFees();
                break;
            case 'payments':
                loadPaymentStudents();
                break;
            case 'receipts':
                loadReceipts();
                break;
            case 'reports':
                setupReportTypes();
                break;
            case 'daily-summary':
                loadDailySummary();
                break;
        }
    }
}

function setupEventListeners() {
    // Student search
    const searchInput = document.getElementById('searchStudents');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadStudents, 300));
    }
    
    // Payment student search
    const paymentSearch = document.getElementById('paymentStudentSearch');
    if (paymentSearch) {
        paymentSearch.addEventListener('input', debounce(searchPaymentStudent, 300));
    }
    
    // Receipt search
    const receiptSearch = document.getElementById('searchReceipts');
    if (receiptSearch) {
        receiptSearch.addEventListener('input', debounce(searchReceipts, 300));
    }
}

function setupSearch() {
    // Add search functionality to all search boxes
    const searchBoxes = document.querySelectorAll('.search-box input');
    searchBoxes.forEach(box => {
        box.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                // Trigger appropriate search based on current page
                switch(currentPage) {
                    case 'students':
                        loadStudents();
                        break;
                    case 'receipts':
                        searchReceipts();
                        break;
                }
            }
        });
    });
}

// DASHBOARD FUNCTIONS
async function loadDashboard() {
    try {
        const result = await callAPI('getDashboard');
        
        if (result.success) {
            const dashboard = result.dashboard;
            
            // Update stats cards
            document.getElementById('totalStudents').textContent = dashboard.totalStudents;
            document.getElementById('todayCollection').textContent = formatCurrency(dashboard.todayCollection);
            document.getElementById('todayPayments').textContent = `${dashboard.todayPayments} payments today`;
            document.getElementById('totalCollected').textContent = formatCurrency(dashboard.totalCollected);
            document.getElementById('totalOutstanding').textContent = formatCurrency(dashboard.totalOutstanding);
            
            // Load recent payments
            loadRecentPayments();
            
            // Load class distribution
            loadClassDistribution(dashboard.studentsByClass);
        } else {
            showError('Failed to load dashboard data: ' + result.message);
        }
    } catch (error) {
        showError('Error loading dashboard: ' + error.message);
    }
}

async function loadRecentPayments() {
    try {
        const result = await callAPI('getPayments', {
            startDate: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
        });
        
        if (result.success) {
            const table = document.getElementById('recentPaymentsTable');
            if (!table) return;
            
            if (result.payments.length === 0) {
                table.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center">No recent payments found</td>
                    </tr>
                `;
                return;
            }
            
            // Get last 5 payments
            const recentPayments = result.payments
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5);
            
            let html = '';
            recentPayments.forEach(payment => {
                const time = new Date(payment.date).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                html += `
                    <tr>
                        <td>${time}</td>
                        <td>${payment.studentName}</td>
                        <td>${payment.class}</td>
                        <td class="currency">${formatCurrency(payment.amount)}</td>
                        <td>${payment.method}</td>
                        <td><span class="status-badge status-paid">Paid</span></td>
                    </tr>
                `;
            });
            
            table.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading recent payments:', error);
    }
}

function loadClassDistribution(distributionData) {
    const container = document.getElementById('classDistribution');
    if (!container) return;
    
    if (!distributionData || Object.keys(distributionData).length === 0) {
        container.innerHTML = '<div class="loading">No distribution data available</div>';
        return;
    }
    
    let html = '';
    for (const [className, count] of Object.entries(distributionData)) {
        const percentage = (count / Object.values(distributionData).reduce((a, b) => a + b, 0)) * 100;
        
        html += `
            <div class="class-distribution-item">
                <div class="class-name">${className}</div>
                <div class="distribution-bar">
                    <div class="bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="class-count">${count} students</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// STUDENT MANAGEMENT FUNCTIONS
async function loadStudents() {
    try {
        const classFilter = document.getElementById('classFilter')?.value || 'all';
        const searchTerm = document.getElementById('searchStudents')?.value || '';
        
        const result = await callAPI('getStudents', {
            classFilter: classFilter,
            searchTerm: searchTerm
        });
        
        if (result.success) {
            renderStudentsTable(result.students);
        } else {
            showError('Failed to load students: ' + result.message);
        }
    } catch (error) {
        showError('Error loading students: ' + error.message);
    }
}

function renderStudentsTable(students) {
    const table = document.getElementById('studentsTable');
    if (!table) return;
    
    if (students.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No students found</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    students.forEach(student => {
        html += `
            <tr>
                <td><strong>${student.Student_ID}</strong></td>
                <td>${student.Full_Name}</td>
                <td>${student.Gender}</td>
                <td>${student.Class}</td>
                <td>${student.Academic_Term}</td>
                <td>${student.Academic_Year}</td>
                <td>
                    <div class="action-buttons-small">
                        <button class="action-btn-small edit" onclick="editStudent('${student.Student_ID}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn-small delete" onclick="deleteStudent('${student.Student_ID}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    table.innerHTML = html;
}

function showAddStudentForm() {
    const form = document.getElementById('addStudentForm');
    if (form) {
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
    }
}

function hideAddStudentForm() {
    const form = document.getElementById('addStudentForm');
    if (form) {
        form.style.display = 'none';
        document.getElementById('studentForm').reset();
    }
}

async function saveStudent(event) {
    event.preventDefault();
    
    const formData = {
        fullName: document.getElementById('fullName').value,
        gender: document.getElementById('gender').value,
        class: document.getElementById('studentClass').value,
        term: document.getElementById('academicTerm').value,
        year: document.getElementById('academicYear').value
    };
    
    // Validate form
    if (!formData.fullName || !formData.gender || !formData.class || !formData.term || !formData.year) {
        showError('Please fill in all required fields');
        return;
    }
    
    try {
        const result = await callAPI('addStudent', formData);
        
        if (result.success) {
            showSuccess('Student added successfully! Student ID: ' + result.studentId);
            hideAddStudentForm();
            loadStudents();
            
            // Reset form
            document.getElementById('studentForm').reset();
        } else {
            showError('Failed to add student: ' + result.message);
        }
    } catch (error) {
        showError('Error adding student: ' + error.message);
    }
}

function editStudent(studentId) {
    // Implement edit functionality
    showSuccess('Edit feature will be implemented in next version');
}

function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        // Implement delete functionality
        showSuccess('Delete feature will be implemented in next version');
    }
}

// FEES MANAGEMENT FUNCTIONS
async function loadFees() {
    try {
        // For now, we'll use mock data
        const fees = JSON.parse(localStorage.getItem('mockFees')) || [];
        renderFeesTable(fees);
    } catch (error) {
        showError('Error loading fees: ' + error.message);
    }
}

function renderFeesTable(fees) {
    const table = document.getElementById('feesTable');
    if (!table) return;
    
    if (fees.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">No fees configured yet</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    fees.forEach(fee => {
        html += `
            <tr>
                <td>${fee.Class}</td>
                <td>${fee.Term}</td>
                <td>${fee.Year}</td>
                <td class="currency">${formatCurrency(fee.Daily_Fee)}</td>
                <td class="currency">${formatCurrency(fee.Term_Fee)}</td>
                <td>${formatDate(fee.Last_Updated)}</td>
                <td>
                    <div class="action-buttons-small">
                        <button class="action-btn-small edit" onclick="editFees('${fee.Class}', '${fee.Term}', '${fee.Year}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    table.innerHTML = html;
}

async function loadClassFees() {
    const className = document.getElementById('feeClass').value;
    const term = document.getElementById('feeTerm').value;
    const year = document.getElementById('feeYear').value;
    
    if (!className || !term || !year) {
        document.getElementById('currentFeesInfo').style.display = 'none';
        return;
    }
    
    try {
        const result = await callAPI('getFees', {
            class: className,
            term: term,
            year: year
        });
        
        if (result.success) {
            const infoDiv = document.getElementById('currentFeesInfo');
            const infoText = document.getElementById('currentFeesText');
            
            if (result.termFee > 0) {
                infoDiv.style.display = 'block';
                infoText.textContent = `Current fees: Daily - ${formatCurrency(result.dailyFee)}, Term - ${formatCurrency(result.termFee)}`;
                
                // Set form values
                document.getElementById('dailyFee').value = result.dailyFee;
                document.getElementById('termFee').value = result.termFee;
            } else {
                infoDiv.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading class fees:', error);
    }
}

async function saveFees(event) {
    event.preventDefault();
    
    const formData = {
        class: document.getElementById('feeClass').value,
        term: document.getElementById('feeTerm').value,
        year: document.getElementById('feeYear').value,
        dailyFee: document.getElementById('dailyFee').value,
        termFee: document.getElementById('termFee').value
    };
    
    // Validate form
    if (!formData.class || !formData.term || !formData.year || 
        !formData.dailyFee || !formData.termFee) {
        showError('Please fill in all required fields');
        return;
    }
    
    if (formData.dailyFee <= 0 || formData.termFee <= 0) {
        showError('Fee amounts must be greater than zero');
        return;
    }
    
    try {
        const result = await callAPI('setFees', formData);
        
        if (result.success) {
            showSuccess('Fees saved successfully!');
            loadFees();
            resetFeesForm();
        } else {
            showError('Failed to save fees: ' + result.message);
        }
    } catch (error) {
        showError('Error saving fees: ' + error.message);
    }
}

function resetFeesForm() {
    document.getElementById('feesForm').reset();
    document.getElementById('currentFeesInfo').style.display = 'none';
}

function editFees(className, term, year) {
    // Load the selected fees into the form
    document.getElementById('feeClass').value = className;
    document.getElementById('feeTerm').value = term;
    document.getElementById('feeYear').value = year;
    
    // Trigger load of current fees
    loadClassFees();
    
    // Scroll to form
    document.getElementById('feesForm').scrollIntoView({ behavior: 'smooth' });
}

// PAYMENT COLLECTION FUNCTIONS
async function loadPaymentStudents() {
    try {
        const classFilter = document.getElementById('paymentClassFilter')?.value || 'all';
        const searchTerm = document.getElementById('paymentStudentSearch')?.value || '';
        
        const result = await callAPI('getStudents', {
            classFilter: classFilter,
            searchTerm: searchTerm
        });
        
        if (result.success) {
            renderPaymentStudentsList(result.students);
        }
    } catch (error) {
        console.error('Error loading payment students:', error);
    }
}

function renderPaymentStudentsList(students) {
    const container = document.getElementById('paymentStudentsList');
    if (!container) return;
    
    if (students.length === 0) {
        container.innerHTML = `
            <div class="loading">No students found</div>
        `;
        return;
    }
    
    let html = '';
    students.forEach(student => {
        html += `
            <div class="student-item" onclick="selectStudentForPayment('${student.Student_ID}')" 
                 data-student-id="${student.Student_ID}">
                <div class="student-name">${student.Full_Name}</div>
                <div class="student-details">
                    <span>${student.Student_ID}</span>
                    <span>${student.Class}</span>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

async function selectStudentForPayment(studentId) {
    try {
        const result = await callAPI('getStudents', {});
        
        if (result.success) {
            const student = result.students.find(s => s.Student_ID === studentId);
            if (student) {
                selectedStudent = student;
                
                // Update selected student display
                document.getElementById('selectedStudentInfo').style.display = 'block';
                document.getElementById('paymentStudentId').textContent = student.Student_ID;
                document.getElementById('paymentStudentName').textContent = student.Full_Name;
                document.getElementById('paymentStudentClass').textContent = student.Class;
                document.getElementById('paymentStudentTerm').textContent = student.Academic_Term;
                
                // Show payment form
                document.getElementById('paymentForm').style.display = 'block';
                
                // Load fee information
                await loadStudentFeeInfo(student);
                
                // Update selected student in list
                const studentItems = document.querySelectorAll('.student-item');
                studentItems.forEach(item => {
                    item.classList.remove('selected');
                    if (item.dataset.studentId === studentId) {
                        item.classList.add('selected');
                    }
                });
            }
        }
    } catch (error) {
        showError('Error selecting student: ' + error.message);
    }
}

async function loadStudentFeeInfo(student) {
    try {
        // Get fee structure
        const feeResult = await callAPI('getFees', {
            class: student.Class,
            term: student.Academic_Term,
            year: student.Academic_Year
        });
        
        if (feeResult.success) {
            // Get payment history
            const paymentResult = await callAPI('getPayments', {
                studentId: student.Student_ID
            });
            
            let totalPaid = 0;
            if (paymentResult.success) {
                totalPaid = paymentResult.payments.reduce((sum, p) => sum + p.amount, 0);
            }
            
            const balance = feeResult.termFee - totalPaid;
            
            // Update display
            document.getElementById('termFeeDisplay').textContent = formatCurrency(feeResult.termFee);
            document.getElementById('paidAlready').textContent = formatCurrency(totalPaid);
            document.getElementById('balanceDue').textContent = formatCurrency(balance);
            
            // Set payment amount max
            const amountInput = document.getElementById('paymentAmount');
            amountInput.max = balance;
            amountInput.value = '';
            
            // Update payment date to today
            document.getElementById('paymentDate').value = getCurrentDate();
        }
    } catch (error) {
        console.error('Error loading fee info:', error);
    }
}

function searchPaymentStudent() {
    loadPaymentStudents();
}

async function processPayment(event) {
    event.preventDefault();
    
    if (!selectedStudent) {
        showError('Please select a student first');
        return;
    }
    
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const method = document.getElementById('paymentMethod').value;
    const receiver = document.getElementById('paymentReceiver').value;
    const paymentDate = document.getElementById('paymentDate').value;
    
    // Validation
    if (!amount || amount <= 0) {
        showError('Please enter a valid payment amount');
        return;
    }
    
    if (!method) {
        showError('Please select a payment method');
        return;
    }
    
    if (!receiver.trim()) {
        showError('Please enter receiver name');
        return;
    }
    
    // Get current balance
    const balanceDueElement = document.getElementById('balanceDue');
    const balanceDue = parseFloat(balanceDueElement.textContent.replace(/[^0-9.-]+/g, ""));
    
    if (amount > balanceDue) {
        showError('Payment amount cannot exceed balance due');
        return;
    }
    
    try {
        const result = await callAPI('recordPayment', {
            studentId: selectedStudent.Student_ID,
            studentName: selectedStudent.Full_Name,
            class: selectedStudent.Class,
            amount: amount,
            paymentMethod: method,
            receiver: receiver
        });
        
        if (result.success) {
            // Show success message
            document.getElementById('paymentForm').style.display = 'none';
            document.getElementById('paymentSuccess').style.display = 'block';
            
            document.getElementById('receiptNumber').textContent = result.receiptNumber;
            document.getElementById('newBalance').textContent = formatCurrency(result.balanceRemaining);
            
            // Store receipt number for printing
            selectedReceipt = result.receiptNumber;
            
            // Refresh dashboard
            loadDashboard();
            
            // Clear search
            document.getElementById('paymentStudentSearch').value = '';
            loadPaymentStudents();
        } else {
            showError('Payment failed: ' + result.message);
        }
    } catch (error) {
        showError('Error processing payment: ' + error.message);
    }
}

function clearPaymentForm() {
    selectedStudent = null;
    document.getElementById('selectedStudentInfo').style.display = 'none';
    document.getElementById('paymentForm').style.display = 'none';
    document.getElementById('paymentForm').reset();
    
    // Clear selection in list
    const studentItems = document.querySelectorAll('.student-item');
    studentItems.forEach(item => item.classList.remove('selected'));
}

function clearPaymentSuccess() {
    document.getElementById('paymentSuccess').style.display = 'none';
    clearPaymentForm();
}

// RECEIPT FUNCTIONS
async function loadReceipts() {
    try {
        // For now, use mock data
        const receipts = JSON.parse(localStorage.getItem('mockReceipts')) || [];
        renderReceiptsTable(receipts);
    } catch (error) {
        showError('Error loading receipts: ' + error.message);
    }
}

function renderReceiptsTable(receipts) {
    const table = document.getElementById('receiptsTable');
    if (!table) return;
    
    if (receipts.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">No receipts found</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    receipts.forEach(receipt => {
        html += `
            <tr>
                <td><strong>${receipt.Receipt_Number}</strong></td>
                <td>${formatDate(receipt.Payment_Date)}</td>
                <td>${receipt.Student_Name}</td>
                <td>${receipt.Class}</td>
                <td class="currency">${formatCurrency(receipt.Amount_Paid)}</td>
                <td>${receipt.Payment_Method}</td>
                <td>${receipt.Receiver}</td>
                <td class="currency">${formatCurrency(receipt.New_Balance)}</td>
                <td>
                    <div class="action-buttons-small">
                        <button class="action-btn-small view" onclick="viewReceipt('${receipt.Receipt_Number}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn-small" onclick="printReceipt('${receipt.Receipt_Number}')">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    table.innerHTML = html;
}

function searchReceipts() {
    const searchTerm = document.getElementById('searchReceipts')?.value || '';
    const dateFilter = document.getElementById('receiptDateFilter')?.value || 'all';
    
    // Filter logic would go here
    // For now, just reload all receipts
    loadReceipts();
}

async function viewReceipt(receiptNumber) {
    try {
        const result = await callAPI('getReceipt', { receiptNumber: receiptNumber });
        
        if (result.success) {
            selectedReceipt = result.receipt;
            showReceiptModal(result.receipt);
        } else {
            showError('Receipt not found: ' + result.message);
        }
    } catch (error) {
        showError('Error loading receipt: ' + error.message);
    }
}

function showReceiptModal(receipt) {
    const modal = document.getElementById('receiptModal');
    const preview = document.getElementById('receiptPreview');
    
    if (!modal || !preview) return;
    
    const receiptHtml = generateReceiptHTML(receipt);
    preview.innerHTML = receiptHtml;
    
    modal.style.display = 'flex';
    modal.classList.add('active');
}

function closeReceiptModal() {
    const modal = document.getElementById('receiptModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function printReceiptFromModal() {
    if (selectedReceipt) {
        printReceipt(selectedReceipt.Receipt_Number || selectedReceipt);
    }
}

// REPORT FUNCTIONS
function setupReportTypes() {
    const reportTypes = document.querySelectorAll('.report-type');
    
    reportTypes.forEach(type => {
        type.addEventListener('click', function() {
            const reportType = this.dataset.type;
            
            // Update active state
            reportTypes.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update form based on report type
            updateReportForm(reportType);
        });
    });
}

function updateReportForm(reportType) {
    const dateInput = document.getElementById('reportDate');
    
    switch(reportType) {
        case 'daily':
            dateInput.style.display = 'block';
            break;
        case 'weekly':
            dateInput.style.display = 'none';
            // Set date to start of week
            break;
        case 'monthly':
            dateInput.style.display = 'none';
            // Set date to start of month
            break;
        case 'termly':
            dateInput.style.display = 'none';
            break;
    }
}

async function generateReport() {
    const reportType = document.querySelector('.report-type.active')?.dataset.type || 'daily';
    const date = document.getElementById('reportDate')?.value;
    const className = document.getElementById('reportClass')?.value || 'all';
    const term = document.getElementById('reportTerm')?.value || 'all';
    
    // For now, show a placeholder message
    showInfo('Report generation will be implemented in the next version. This feature will include detailed analytics and export capabilities.');
    
    // In a real implementation, you would:
    // 1. Call the appropriate API endpoint
    // 2. Process the data
    // 3. Render the report
}

function printReport() {
    window.print();
}

// DAILY SUMMARY FUNCTIONS
async function loadDailySummary() {
    const date = document.getElementById('summaryDate')?.value || getCurrentDate();
    
    try {
        // For now, use mock data
        const payments = JSON.parse(localStorage.getItem('mockPayments')) || [];
        const students = JSON.parse(localStorage.getItem('mockStudents')) || [];
        
        // Filter payments for selected date
        const dailyPayments = payments.filter(p => 
            new Date(p.Payment_Date).toISOString().split('T')[0] === date
        );
        
        // Calculate totals
        const totalCollected = dailyPayments.reduce((sum, p) => sum + p.Amount_Paid, 0);
        const totalStudents = students.length;
        const studentsPaid = [...new Set(dailyPayments.map(p => p.Student_ID))].length;
        const studentsUnpaid = totalStudents - studentsPaid;
        
        // Update summary cards
        document.getElementById('dailyTotalCollected').textContent = formatCurrency(totalCollected);
        document.getElementById('dailyTotalPayments').textContent = `${dailyPayments.length} payments`;
        document.getElementById('dailyStudentsPaid').textContent = studentsPaid;
        document.getElementById('dailyStudentsUnpaid').textContent = studentsUnpaid;
        
        // Calculate outstanding (simplified)
        const outstanding = 0; // Would calculate based on fee structure
        document.getElementById('dailyOutstanding').textContent = formatCurrency(outstanding);
        
        // Load detailed tables
        loadPaidStudentsTable(dailyPayments);
        loadUnpaidStudentsTable(students, dailyPayments, date);
        loadByClassTable(students, dailyPayments);
        
    } catch (error) {
        showError('Error loading daily summary: ' + error.message);
    }
}

function loadPaidStudentsTable(payments) {
    const table = document.getElementById('paidStudentsTable');
    if (!table) return;
    
    if (payments.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No payments recorded for selected date</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    payments.forEach(payment => {
        const time = new Date(payment.Payment_Date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        html += `
            <tr>
                <td>${payment.Student_Name}</td>
                <td>${payment.Class}</td>
                <td class="currency">${formatCurrency(payment.Amount_Paid)}</td>
                <td>${payment.Payment_Method}</td>
                <td>${time}</td>
                <td>${payment.Receipt_Number}</td>
            </tr>
        `;
    });
    
    table.innerHTML = html;
}

function loadUnpaidStudentsTable(allStudents, dailyPayments, date) {
    const table = document.getElementById('unpaidStudentsTable');
    if (!table) return;
    
    // Get student IDs who paid today
    const paidStudentIds = [...new Set(dailyPayments.map(p => p.Student_ID))];
    
    // Filter students who didn't pay today
    const unpaidStudents = allStudents.filter(student => 
        !paidStudentIds.includes(student.Student_ID)
    );
    
    if (unpaidStudents.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">All students have made payments today</td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    unpaidStudents.forEach(student => {
        html += `
            <tr>
                <td>${student.Full_Name}</td>
                <td>${student.Class}</td>
                <td>${formatDate(student.Date_Created)}</td>
                <td class="currency">-</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="selectUnpaidStudent('${student.Student_ID}')">
                        Collect Payment
                    </button>
                </td>
            </tr>
        `;
    });
    
    table.innerHTML = html;
}

function loadByClassTable(allStudents, dailyPayments) {
    const table = document.getElementById('byClassTable');
    if (!table) return;
    
    // Group students by class
    const studentsByClass = {};
    allStudents.forEach(student => {
        if (!studentsByClass[student.Class]) {
            studentsByClass[student.Class] = [];
        }
        studentsByClass[student.Class].push(student);
    });
    
    // Group payments by class
    const paymentsByClass = {};
    dailyPayments.forEach(payment => {
        if (!paymentsByClass[payment.Class]) {
            paymentsByClass[payment.Class] = [];
        }
        paymentsByClass[payment.Class].push(payment);
    });
    
    let html = '';
    let totalStudents = 0;
    let totalPaid = 0;
    let totalCollected = 0;
    
    for (const [className, students] of Object.entries(studentsByClass)) {
        const classPayments = paymentsByClass[className] || [];
        const paidStudentIds = [...new Set(classPayments.map(p => p.Student_ID))];
        const studentsPaid = paidStudentIds.length;
        const studentsUnpaid = students.length - studentsPaid;
        const amountCollected = classPayments.reduce((sum, p) => sum + p.Amount_Paid, 0);
        const percentagePaid = students.length > 0 ? Math.round((studentsPaid / students.length) * 100) : 0;
        
        totalStudents += students.length;
        totalPaid += studentsPaid;
        totalCollected += amountCollected;
        
        html += `
            <tr>
                <td>${className}</td>
                <td>${students.length}</td>
                <td>${studentsPaid}</td>
                <td>${studentsUnpaid}</td>
                <td class="currency">${formatCurrency(amountCollected)}</td>
                <td>-</td>
                <td>${percentagePaid}%</td>
            </tr>
        `;
    }
    
    // Add totals row
    const totalPercentage = totalStudents > 0 ? Math.round((totalPaid / totalStudents) * 100) : 0;
    html += `
        <tr class="total-row">
            <td><strong>TOTAL</strong></td>
            <td><strong>${totalStudents}</strong></td>
            <td><strong>${totalPaid}</strong></td>
            <td><strong>${totalStudents - totalPaid}</strong></td>
            <td class="currency"><strong>${formatCurrency(totalCollected)}</strong></td>
            <td><strong>-</strong></td>
            <td><strong>${totalPercentage}%</strong></td>
        </tr>
    `;
    
    table.innerHTML = html;
}

function showSummaryTab(tabName) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.add('active');
    }
    
    // Activate corresponding button
    const button = Array.from(tabButtons).find(btn => 
        btn.textContent.includes(tabName.charAt(0).toUpperCase() + tabName.slice(1))
    );
    if (button) {
        button.classList.add('active');
    }
}

function selectUnpaidStudent(studentId) {
    // Switch to payments page and select the student
    loadPage('payments');
    
    // Find and select the student
    setTimeout(() => {
        // This would be implemented to automatically select the student
        showInfo(`Switch to student ID: ${studentId}. Search for this student in the payments page.`);
    }, 500);
}

// RECEIPT GENERATION FUNCTIONS
function generateReceiptHTML(receiptData) {
    return `
        <div class="receipt" id="printableReceipt">
            <div class="receipt-header">
                <h2>${SCHOOL_INFO.name}</h2>
                <p>${SCHOOL_INFO.address}</p>
                <p>Tel: ${SCHOOL_INFO.phone} | Email: ${SCHOOL_INFO.email}</p>
                <p><strong>OFFICIAL FEES RECEIPT</strong></p>
            </div>
            
            <div class="receipt-divider"></div>
            
            <div class="receipt-body">
                <div class="receipt-item">
                    <span>Receipt No:</span>
                    <span>${receiptData.receiptNumber || receiptData.Receipt_Number}</span>
                </div>
                <div class="receipt-item">
                    <span>Date:</span>
                    <span>${formatDate(receiptData.paymentDate || receiptData.Payment_Date)}</span>
                </div>
                <div class="receipt-item">
                    <span>Time:</span>
                    <span>${new Date(receiptData.paymentDate || receiptData.Payment_Date).toLocaleTimeString()}</span>
                </div>
                
                <div class="receipt-divider"></div>
                
                <div class="receipt-item">
                    <span>Student ID:</span>
                    <span>${receiptData.studentId || receiptData.Student_ID}</span>
                </div>
                <div class="receipt-item">
                    <span>Student Name:</span>
                    <span>${receiptData.studentName || receiptData.Student_Name}</span>
                </div>
                <div class="receipt-item">
                    <span>Class:</span>
                    <span>${receiptData.class || receiptData.Class}</span>
                </div>
                <div class="receipt-item">
                    <span>Term/Year:</span>
                    <span>${receiptData.term || receiptData.Term} ${receiptData.academicYear || receiptData.Academic_Year}</span>
                </div>
                
                <div class="receipt-divider"></div>
                
                <div class="receipt-item">
                    <span>Amount Received:</span>
                    <span class="currency">${formatCurrency(receiptData.amountPaid || receiptData.Amount_Paid)}</span>
                </div>
                <div class="receipt-item">
                    <span>Payment Method:</span>
                    <span>${receiptData.paymentMethod || receiptData.Payment_Method}</span>
                </div>
                <div class="receipt-item">
                    <span>Received By:</span>
                    <span>${receiptData.receiver || receiptData.Receiver}</span>
                </div>
                
                <div class="receipt-divider"></div>
                
                <div class="receipt-item">
                    <span>Previous Balance:</span>
                    <span class="currency">${formatCurrency(receiptData.previousBalance || receiptData.Previous_Balance)}</span>
                </div>
                <div class="receipt-item total">
                    <span>Balance Remaining:</span>
                    <span class="currency">${formatCurrency(receiptData.newBalance || receiptData.New_Balance)}</span>
                </div>
            </div>
            
            <div class="receipt-footer">
                <p>Thank you for your payment!</p>
                <p>This is a computer-generated receipt. No signature required.</p>
                <p>${SCHOOL_INFO.motto}</p>
            </div>
        </div>
    `;
}

function printReceipt(receiptNumber = null) {
    if (!receiptNumber && selectedReceipt) {
        receiptNumber = selectedReceipt.Receipt_Number || selectedReceipt;
    }
    
    if (!receiptNumber) {
        showError('No receipt selected for printing');
        return;
    }
    
    // In a real implementation, you would:
    // 1. Fetch receipt data
    // 2. Generate receipt HTML
    // 3. Open print dialog
    
    const receiptHtml = generateReceiptHTML({ 
        receiptNumber: receiptNumber,
        paymentDate: new Date().toISOString(),
        studentId: 'HFPS-240112-1234',
        studentName: 'Sample Student',
        class: 'Basic 1',
        term: 'Term 1',
        academicYear: '2024',
        amountPaid: 150.00,
        paymentMethod: 'Cash',
        receiver: 'Administrator',
        previousBalance: 450.00,
        newBalance: 300.00
    });
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .receipt { max-width: 400px; margin: 0 auto; }
                .receipt-header { text-align: center; margin-bottom: 20px; }
                .receipt-divider { border-top: 2px dashed #000; margin: 10px 0; }
                .receipt-item { display: flex; justify-content: space-between; margin: 5px 0; }
                .receipt-item.total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; }
                .receipt-footer { text-align: center; margin-top: 20px; font-size: 12px; }
                @media print {
                    body { margin: 0; }
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            ${receiptHtml}
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()">Print Receipt</button>
                <button onclick="window.close()">Close</button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// UTILITY FUNCTIONS
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    alert('Success: ' + message);
}

function showInfo(message) {
    alert('Info: ' + message);
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // In a real implementation, clear session and redirect
        alert('Logout successful. Redirecting to login page...');
        // window.location.href = 'login.html';
    }
}

// Helper function to format numbers as currency
function formatCurrency(amount) {
    return `${SETTINGS.currencySymbol} ${parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
}

// Helper function to format dates
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Initialize mock data on first run
function initializeMockData() {
    if (!localStorage.getItem('mockDataInitialized')) {
        const mockStudents = [
            {
                Student_ID: 'HFPS-240112-1001',
                Full_Name: 'Kwame Asante',
                Gender: 'Male',
                Class: 'Basic 1',
                Academic_Term: 'Term 1',
                Academic_Year: '2024',
                Date_Created: '2024-01-12',
                Status: 'Active'
            },
            {
                Student_ID: 'HFPS-240112-1002',
                Full_Name: 'Ama Mensah',
                Gender: 'Female',
                Class: 'Basic 2',
                Academic_Term: 'Term 1',
                Academic_Year: '2024',
                Date_Created: '2024-01-12',
                Status: 'Active'
            }
        ];
        
        const mockFees = [
            {
                Class: 'Basic 1',
                Term: 'Term 1',
                Year: '2024',
                Daily_Fee: 10,
                Term_Fee: 550,
                Last_Updated: '2024-01-12'
            },
            {
                Class: 'Basic 2',
                Term: 'Term 1',
                Year: '2024',
                Daily_Fee: 11,
                Term_Fee: 600,
                Last_Updated: '2024-01-12'
            }
        ];
        
        localStorage.setItem('mockStudents', JSON.stringify(mockStudents));
        localStorage.setItem('mockFees', JSON.stringify(mockFees));
        localStorage.setItem('mockDataInitialized', 'true');
    }
}

// Initialize mock data
initializeMockData();