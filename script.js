// Language Switching Functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize language from localStorage or default to English
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'en';
    document.documentElement.setAttribute('data-language', savedLanguage);

    // Language toggle button functionality
    const languageBtn = document.querySelector('.translate-btn');
    if (languageBtn) {
        languageBtn.addEventListener('click', toggleLanguage);
    }
});

function toggleLanguage() {
    const html = document.documentElement;
    const currentLang = html.getAttribute('data-language');
    const newLang = currentLang === 'en' ? 'am' : 'en';
    
    html.setAttribute('data-language', newLang);
    localStorage.setItem('preferredLanguage', newLang);
}

// Donation Form Handling
const donationForm = {
    selectedAmount: 0,
    init() {
        this.initAmountButtons();
        this.initCustomAmount();
        this.initPayPalButtons();
    },

    initAmountButtons() {
        const amountButtons = document.querySelectorAll('.amount-option');
        const customAmountInput = document.querySelector('.custom-amount-input');

        amountButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                amountButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                e.target.classList.add('active');

                if (e.target.classList.contains('custom')) {
                    customAmountInput.hidden = false;
                    this.selectedAmount = 0;
                } else {
                    customAmountInput.hidden = true;
                    this.selectedAmount = parseFloat(e.target.dataset.amount);
                }
            });
        });
    },

    initCustomAmount() {
        const customInput = document.getElementById('custom-amount');
        if (customInput) {
            customInput.addEventListener('input', (e) => {
                this.selectedAmount = parseFloat(e.target.value) || 0;
            });
        }
    },

    initPayPalButtons() {
        if (window.paypal) {
            paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: this.selectedAmount.toString()
                            }
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    const order = await actions.order.capture();
                    this.handleSuccessfulDonation(order);
                },
                onError: (err) => {
                    console.error('PayPal Error:', err);
                    this.showErrorMessage('Payment failed. Please try again.');
                }
            }).render('#paypal-button-container');
        }
    },

    handleSuccessfulDonation(order) {
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'donation-success-message';
        successMessage.textContent = document.documentElement.getAttribute('data-language') === 'en' 
            ? 'Thank you for your donation!' 
            : 'ለልገሳዎ እናመሰግናለን!';
        
        const donationContainer = document.querySelector('.donation-container');
        donationContainer.prepend(successMessage);

        // Remove message after 5 seconds
        setTimeout(() => {
            successMessage.remove();
        }, 5000);
    },

    showErrorMessage(message) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'donation-error-message';
        errorMessage.textContent = message;
        
        const donationContainer = document.querySelector('.donation-container');
        donationContainer.prepend(errorMessage);

        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }
};

// Newsletter Subscription
const newsletter = {
    init() {
        const form = document.querySelector('.newsletter-form');
        if (form) {
            form.addEventListener('submit', this.handleSubmit.bind(this));
        }
    },

    async handleSubmit(e) {
        e.preventDefault();
        const email = e.target.querySelector('input[type="email"]').value;
        const currentLang = document.documentElement.getAttribute('data-language');

        try {
            const response = await fetch('/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                this.showMessage(
                    currentLang === 'en' 
                        ? 'Successfully subscribed to newsletter!' 
                        : 'በተሳካ ሁኔታ ለዜና መጽሄት ተመዝግበዋል!',
                    'success'
                );
            } else {
                throw new Error('Subscription failed');
            }
        } catch (error) {
            this.showMessage(
                currentLang === 'en' 
                    ? 'Failed to subscribe. Please try again.' 
                    : 'ለመመዝገብ አልተሳካም። እባክዎ እንደገና ይሞክሩ።',
                'error'
            );
        }
    },

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `newsletter-message ${type}`;
        messageDiv.textContent = message;

        const form = document.querySelector('.newsletter-form');
        form.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 5000);
    }
};

// Smooth Scrolling
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Mobile Navigation
const mobileNav = {
    init() {
        const header = document.querySelector('header');
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > lastScroll && currentScroll > 100) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
            lastScroll = currentScroll;
        });
    }
};

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    donationForm.init();
    newsletter.init();
    initSmoothScroll();
    mobileNav.init();

    // Add loading="lazy" to all images for better performance
    document.querySelectorAll('img').forEach(img => {
        if (!img.hasAttribute('loading')) {
            img.setAttribute('loading', 'lazy');
        }
    });
});

// Handle visibility changes for better performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        document.title = document.documentElement.getAttribute('data-language') === 'en'
            ? 'Come back to Amhara Fano Movement'
            : 'ወደ አማራ ፋኖ እንቅስቃሴ ይመለሱ';
    } else {
        document.title = document.documentElement.getAttribute('data-language') === 'en'
            ? 'Amhara Fano Movement - Advocating for Rights and Dignity'
            : 'የአማራ ፋኖ እንቅስቃሴ - ለመብትና ለክብር መከራከር';
    }
});