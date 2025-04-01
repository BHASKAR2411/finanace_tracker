const sgMail = require('@sendgrid/mail');
require('dotenv').config();

console.log('SendGrid API Key:', process.env.SENDGRID_API_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (to, subject, text) => {
  const msg = {
    to,
    from: 'datachondriaa@gmail.com', 
    subject,
    text,
  };
  try {
    await sgMail.send(msg);
    console.log('Email sent to:', to);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;