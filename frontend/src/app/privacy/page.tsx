'use client'

import React from 'react'

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: September 5, 2024</p>
      <div className="prose dark:prose-invert max-w-none">
        <p>Your privacy is important to us. It is Curocity's policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Information We Collect</h2>
        <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
        <p>Log data: When you visit our website, our servers may automatically log the standard data provided by your web browser. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Security</h2>
        <p>We take security seriously. We use commercially acceptable means to protect your personal information from loss or theft, as well as unauthorized access, disclosure, copying, use or modification. That said, we advise that no method of electronic transmission or storage is 100% secure, and cannot guarantee absolute data security.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Links to Other Sites</h2>
        <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        <p>If you have any questions about how we handle user data and personal information, feel free to contact us.</p>
      </div>
    </div>
  )
}
