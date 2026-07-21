import nodemailer from "nodemailer";

const sendEmail = async (options) => {
    // 1. Create the SMTP Transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT, // Usually 587 or 465
        secure: process.env.SMTP_PORT == 465, // true for 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    // 2. Define the email options
    const message = {
        from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`, // e.g., "EchoStream <noreply@echostream.com>"
        to: options.email,
        subject: options.subject,
        html: options.html, // We use HTML so we can send beautiful formatted emails!
    };

    // 3. Send the email
    const info = await transporter.sendMail(message);
    console.log("📧 Email sent successfully: %s", info.messageId);
};

export default sendEmail;