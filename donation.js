// Constants
const MINIMUM_DONATION = 1;
const MAXIMUM_DONATION = 50000;

// DOM Elements
const amountButtons = document.querySelectorAll('.amount-option');
const customAmountContainer = document.querySelector('.custom-amount-input');
const customAmountInput = document.getElementById('custom-amount');
let selectedAmount = 25; // Default amount

// Initialize PayPal button
window.addEventListener('load', () => {
    initializePayPalButton();
    setupDonationButtons();
});

// Setup amount selection buttons
function setupDonationButtons() {
    amountButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            amountButtons.forEach(btn => btn.classList.remove('active'));
            
            // Handle custom amount button
            if (button.classList.contains('custom')) {
                button.classList.add('active');
                customAmountContainer.hidden = false;
                selectedAmount = Number(customAmountInput.value) || 0;
            } else {
                button.classList.add('active');
                customAmountContainer.hidden = true;
                selectedAmount = Number(button.dataset.amount);
            }

            // Reinitialize PayPal button with new amount
            initializePayPalButton();
        });
    });

    // Handle custom amount input
    customAmountInput.addEventListener('input', (e) => {
        let value = Number(e.target.value);
        
        // Validate input
        if (value < MINIMUM_DONATION) {
            value = MINIMUM_DONATION;
        } else if (value > MAXIMUM_DONATION) {
            value = MAXIMUM_DONATION;
        }
        
        selectedAmount = value;
        customAmountInput.value = value;
        
        // Reinitialize PayPal button with new amount
        initializePayPalButton();
    });
}

// Initialize PayPal button with current amount
function initializePayPalButton() {
    const paypalButtonContainer = document.getElementById('paypal-button-container');
    paypalButtonContainer.innerHTML = ''; // Clear existing button

    paypal.Buttons({
        style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'donate'
        },

        createOrder: function(data, actions) {
            // Validate amount before creating order
            if (!isValidAmount(selectedAmount)) {
                showError('Please enter a valid donation amount');
                return;
            }

            return actions.order.create({
                purchase_units: [{
                    amount: {
                        value: selectedAmount.toFixed(2),
                        currency_code: 'USD'
                    },
                    description: 'Donation to Amhara Fano Movement'
                }]
            });
        },

        onApprove: function(data, actions) {
            return actions.order.capture().then(function(details) {
                handleSuccessfulDonation(details);
            });
        },

        onError: function(err) {
            console.error('PayPal error:', err);
            showError('There was an error processing your donation. Please try again.');
        }
    }).render('#paypal-button-container');
}

// Validate donation amount
function isValidAmount(amount) {
    return !isNaN(amount) && 
           amount >= MINIMUM_DONATION && 
           amount <= MAXIMUM_DONATION;
}

// Handle successful donation
function handleSuccessfulDonation(details) {
    // Save donation details to your backend
    saveDonationDetails(details)
        .then(() => {
            showSuccess('Thank you for your donation!');
            sendThankYouEmail(details);
        })
        .catch(error => {
            console.error('Error saving donation:', error);
            // Still show success to user as PayPal processed successfully
            showSuccess('Thank you for your donation!');
        });
}

// Save donation details to backend
async function saveDonationDetails(details) {
    try {
        const response = await fetch('/api/donations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                transactionId: details.id,
                amount: details.purchase_units[0].amount.value,
                currency: details.purchase_units[0].amount.currency_code,
                status: details.status,
                donorName: `${details.payer.name.given_name} ${details.payer.name.surname}`,
                donorEmail: details.payer.email_address,
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save donation details');
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving donation:', error);
        throw error;
    }
}

// Send thank you email
async function sendThankYouEmail(details) {
    try {
        await fetch('/api/send-thank-you', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: details.payer.email_address,
                name: details.payer.name.given_name,
                amount: details.purchase_units[0].amount.value
            })
        });
    } catch (error) {
        console.error('Error sending thank you email:', error);
    }
}

// UI feedback functions
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'donation-success';
    successDiv.textContent = message;
    document.querySelector('.donation-container').appendChild(successDiv);
    
    // Remove success message after 5 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'donation-error';
    errorDiv.textContent = message;
    document.querySelector('.donation-container').appendChild(errorDiv);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}