
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Privacy Policy</CardTitle>
                        <CardDescription>Last updated: August 21, 2024</CardDescription>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                        <p>
                            Welcome to Cabzi. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application.
                        </p>

                        <h2>1. Information We Collect</h2>
                        <p>We may collect information about you in a variety of ways. The information we may collect on the App includes:</p>
                        <ul>
                            <li>
                                <strong>Personal Data:</strong> Personally identifiable information, such as your name, phone number, and email address, that you voluntarily give to us when you register with the App.
                            </li>
                            <li>
                                <strong>Geolocation Information:</strong> We may request access or permission to and track location-based information from your mobile device, either continuously or while you are using the App, to provide location-based services.
                            </li>
                             <li>
                                <strong>Vehicle and Document Information (for Partners):</strong> If you register as a partner (driver or mechanic), we collect information about your vehicle (type, number) and your official documents (Driving Licence, PAN, Aadhaar) for verification purposes.
                            </li>
                        </ul>

                        <h2>2. Use of Your Information</h2>
                        <p>
                            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the App to:
                        </p>
                        <ul>
                            <li>Create and manage your account.</li>
                            <li>Match riders with nearby partners.</li>
                            <li>Process payments and transactions.</li>
                            <li>Provide you with customer support.</li>
                            <li>Ensure the safety and security of our platform.</li>
                        </ul>

                        <h2>3. Disclosure of Your Information</h2>
                        <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
                        <ul>
                            <li>
                                <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.
                            </li>
                            <li>
                                <strong>To other users:</strong> When a ride is accepted, the rider and partner may see each other&apos;s name, photo (if provided), and vehicle information to facilitate the service.
                            </li>
                        </ul>

                        <h2>4. Security of Your Information</h2>
                        <p>
                            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                        </p>

                        <h2>5. Contact Us</h2>
                        <p>If you have questions or comments about this Privacy Policy, please contact us at: <a href="mailto:support@cabzi.com">support@cabzi.com</a></p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
