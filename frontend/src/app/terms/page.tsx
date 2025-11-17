'use client'

import React from 'react'

export default function TermsPage() {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6 max-w-3xl">
      <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: September 5, 2024</p>
      <div className="prose dark:prose-invert max-w-none">
        <p>Welcome to Curocity! These terms and conditions outline the rules and regulations for the use of Curocity's Website, located at curocity.app.</p>
        <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use Curocity if you do not agree to take all of the terms and conditions stated on this page.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Cookies</h2>
        <p>We employ the use of cookies. By accessing Curocity, you agreed to use cookies in agreement with the Curocity's Privacy Policy.</p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">License</h2>
        <p>Unless otherwise stated, Curocity and/or its licensors own the intellectual property rights for all material on Curocity. All intellectual property rights are reserved. You may access this from Curocity for your own personal use subjected to restrictions set in these terms and conditions.</p>
        <p>You must not:</p>
        <ul>
            <li>Republish material from Curocity</li>
            <li>Sell, rent or sub-license material from Curocity</li>
            <li>Reproduce, duplicate or copy material from Curocity</li>
            <li>Redistribute content from Curocity</li>
        </ul>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Disclaimer</h2>
        <p>To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:</p>
        <ul>
            <li>limit or exclude our or your liability for death or personal injury;</li>
            <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
            <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
            <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
        </ul>
      </div>
    </div>
  )
}
