import emailjs from '@emailjs/browser';
import toast from 'react-hot-toast';

export const sendContactEmail = async (formData: {
  name: string;
  email: string;
  phone: string;
  message: string;
  organization_type: string;
}) => {
  try {
    // Send email to connect@sponsorstudio.in
    await emailjs.send(
      'service_f8hd0bm',
      'template_5avduob',
      {
        to_email: 'connect@sponsorstudio.in',
        from_name: formData.name,
        from_email: formData.email,
        phone: formData.phone,
        organization_type: formData.organization_type,
        message: formData.message,
      },
      'qZ4Yui6OPsXT6U99A'
    );

    // Send thank you email to user
    await emailjs.send(
      'service_f8hd0bm',
      'template_9i4r64k',
      {
        to_email: formData.email,
        name: formData.name,
      },
      'qZ4Yui6OPsXT6U99A'
    );

    toast.success('Message sent successfully!');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    toast.error('Failed to send message. Please try again.');
    return false;
  }
};

export const sendMatchNotification = async (
  brandName: string,
  brandEmail: string,
  eventTitle: string,
  eventOrganizer: string,
  organizerEmail: string,
  calendlyLink?: string,
  brochureUrl?: string
) => {
  try {
    // Send notification to event organizer
    await emailjs.send(
      'service_f8hd0bm',
      'template_match_notification',
      {
        to_email: organizerEmail,
        brand_name: brandName,
        brand_email: brandEmail,
        event_title: eventTitle,
      },
      'qZ4Yui6OPsXT6U99A'
    );

    // Send details to brand
    await emailjs.send(
      'service_f8hd0bm',
      'template_match_details',
      {
        to_email: brandEmail,
        brand_name: brandName,
        event_title: eventTitle,
        event_organizer: eventOrganizer,
        calendly_link: calendlyLink || 'Not available',
        brochure_url: brochureUrl || 'Not available',
      },
      'qZ4Yui6OPsXT6U99A'
    );

    toast.success('Match notification sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending match notification:', error);
    toast.error('Failed to send match notification');
    return false;
  }
};

export const sendMeetingConfirmation = async (
  brandName: string,
  brandEmail: string,
  eventTitle: string,
  eventOrganizer: string,
  organizerEmail: string,
  meetingTime: string,
  meetingLink: string
) => {
  try {
    // Send confirmation to brand
    await emailjs.send(
      'service_f8hd0bm',
      'template_meeting_confirmation',
      {
        to_email: brandEmail,
        brand_name: brandName,
        event_title: eventTitle,
        event_organizer: eventOrganizer,
        meeting_time: meetingTime,
        meeting_link: meetingLink
      },
      'qZ4Yui6OPsXT6U99A'
    );

    // Send confirmation to organizer
    await emailjs.send(
      'service_f8hd0bm',
      'template_meeting_confirmation_organizer',
      {
        to_email: organizerEmail,
        brand_name: brandName,
        event_title: eventTitle,
        meeting_time: meetingTime,
        meeting_link: meetingLink
      },
      'qZ4Yui6OPsXT6U99A'
    );

    toast.success('Meeting confirmation sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending meeting confirmation:', error);
    toast.error('Failed to send meeting confirmation');
    return false;
  }
};