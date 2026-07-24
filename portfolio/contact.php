<?php
session_start();
header('Content-Type: application/json');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

// Rate limiting: block if user submits again within 60 seconds
if (isset($_SESSION['last_submit']) && (time() - $_SESSION['last_submit'] < 60)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Please wait 60 seconds before submitting again.']);
    exit;
}

// Require PHPMailer files
require_once 'vendor/phpmailer/Exception.php';
require_once 'vendor/phpmailer/PHPMailer.php';
require_once 'vendor/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Sanitize inputs
$name = isset($_POST['name']) ? strip_tags(htmlspecialchars(trim($_POST['name']))) : '';
$email = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';
$subject = isset($_POST['subject']) ? strip_tags(htmlspecialchars(trim($_POST['subject']))) : '';
$message = isset($_POST['message']) ? strip_tags(htmlspecialchars(trim($_POST['message']))) : '';

// General validation
if (empty($name) || empty($email) || empty($subject) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please fill in all fields.']);
    exit;
}

// Email format validation
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address.']);
    exit;
}

// Length validations
if (strlen($name) < 2 || strlen($name) > 100) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Name must be between 2 and 100 characters.']);
    exit;
}

if (strlen($message) < 10 || strlen($message) > 2000) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Message must be between 10 and 2000 characters.']);
    exit;
}

/*
GMAIL APP PASSWORD NOTE:
- Go to myaccount.google.com
- Enable 2-Step Verification
- Go to Security -> App Passwords
- Generate password for Mail -> Other -> "Portfolio"
- Paste the 16 character password in the Password field below
- Never use your real Gmail password here!
*/

$mail = new PHPMailer(true);

try {
    // Configure PHPMailer SMTP Settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'serajryn@gmail.com';
    $mail->Password   = 'wdtpqwppcadovyjf'; // <--- Placeholder, change this
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Sender and Recipient
    $mail->setFrom('serajryn@gmail.com', 'Portfolio Contact');
    $mail->addAddress('serajryn@gmail.com');
    $mail->addReplyTo($email, $name); // Reply to visitor's email

    // Fully styled HTML email with dark theme matching portfolio design
    $htmlContent = "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #070914; color: #ffffff; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #111425; border-radius: 12px; padding: 30px; border: 1px solid rgba(255, 255, 255, 0.1); }
            .header { border-bottom: 2px solid #f97316; padding-bottom: 15px; margin-bottom: 20px; }
            h2 { color: #f97316; margin: 0; }
            table { width: 100%; border-collapse: collapse; }
            table, th, td { border: none; text-align: left; }
            th { padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #a1a1aa; width: 120px; vertical-align: top; }
            td { padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1); color: #f4f4f5; }
            .message-cell { padding-top: 20px; }
            .message-box { background-color: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; line-height: 1.6; white-space: pre-wrap; margin-top: 10px; border-left: 3px solid #f97316; }
            .footer { margin-top: 30px; font-size: 12px; color: #71717a; text-align: center; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>New Message via Portfolio</h2>
            </div>
            <table>
                <tr>
                    <th>From Name:</th>
                    <td>" . htmlspecialchars($name) . "</td>
                </tr>
                <tr>
                    <th>Email Address:</th>
                    <td>" . htmlspecialchars($email) . "</td>
                </tr>
                <tr>
                    <th>Subject:</th>
                    <td>" . htmlspecialchars($subject) . "</td>
                </tr>
                <tr>
                    <td colspan='2' class='message-cell'>
                        <strong>Message:</strong>
                        <div class='message-box'>" . nl2br(htmlspecialchars($message)) . "</div>
                    </td>
                </tr>
            </table>
            <div class='footer'>
                This email was sent from your portfolio website contact form.
            </div>
        </div>
    </body>
    </html>
    ";

    // Plain text fallback version
    $textContent = "New Message from Portfolio Contact Form\n";
    $textContent .= "--------------------------------------\n";
    $textContent .= "Name: {$name}\n";
    $textContent .= "Email: {$email}\n";
    $textContent .= "Subject: {$subject}\n";
    $textContent .= "Message:\n{$message}\n";

    // Email Content Configuration
    $mail->isHTML(true);
    $mail->Subject = 'New Contact Form Message: ' . $subject;
    $mail->Body    = $htmlContent;
    $mail->AltBody = $textContent;

    $mail->send();

    // On success: save session timestamp to rate limit (once per 60 secs)
    $_SESSION['last_submit'] = time();

    // Returns JSON success
    echo json_encode(['success' => true, 'message' => 'Message sent successfully!']);

} catch (Exception $e) {
    // Never expose real error details to frontend
    // If you need to debug, print $mail->ErrorInfo to an error_log here
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Network error. Could not send message.']);
}
