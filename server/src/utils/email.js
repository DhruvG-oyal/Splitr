import { Resend } from "resend";

export const sendEmail = async ({ to, subject, html }) => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: "Splitr <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
};
