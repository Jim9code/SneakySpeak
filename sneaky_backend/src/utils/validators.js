const validateSchoolEmail = (email) => {
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Extract domain from email
  const domain = email.split('@')[1];

  // List of allowed school domains (can be moved to config/env later)
  const allowedDomains = [
    'edu',          // Generic education domain
    'ac.uk',        // UK academic institutions
    'edu.au',       // Australian education
    'edu.in',       // Indian education
    // Add more school domains as needed
  ];

  // Check if the email domain ends with any of the allowed domains
  const isSchoolDomain = allowedDomains.some(allowed => domain.endsWith(allowed));

  if (!isSchoolDomain) {
    return { 
      isValid: false, 
      error: 'Only school email addresses are allowed' 
    };
  }

  return { 
    isValid: true, 
    domain 
  };
};

const generateVerificationCode = () => {
  // Generate a 6-digit verification code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateUsername = (email) => {
  // Extract the part before @ and remove any special characters
  const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  
  // Add a random suffix to make it more unique
  const randomSuffix = Math.floor(Math.random() * 1000);
  
  return `${username}${randomSuffix}`;
};

module.exports = {
  validateSchoolEmail,
  generateVerificationCode,
  generateUsername
}; 