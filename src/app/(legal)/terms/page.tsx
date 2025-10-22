
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-muted/40 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl">Terms of Service</CardTitle>
                        <CardDescription>Last updated: August 21, 2024</CardDescription>
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                        <h2>1. Agreement to Terms</h2>
                        <p>
                            By using our web application (the &quot;App&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
                        </p>

                        <h2>2. User Accounts</h2>
                        <p>
                            When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                        </p>
                        
                        <h2>3. Partner (Driver/Mechanic) Obligations</h2>
                        <p>
                           Partners agree to maintain their vehicles in a safe and clean condition. They must possess a valid driver&apos;s license and all necessary permits required by law. Partners are independent contractors and not employees of Cabzi.
                        </p>

                        <h2>4. Rider Obligations</h2>
                        <p>
                            Riders agree to treat partners with respect and not to damage their vehicles. Riders are responsible for any charges incurred for the services obtained through their account.
                        </p>

                        <h2>5. Payments and Fees</h2>
                        <p>
                           Riders agree to pay the fare displayed in the app for the services received. Partners agree to the subscription model, where they pay a fixed fee to access the platform and keep 100% of the ride fare. All payments are subject to applicable taxes.
                        </p>

                        <h2>6. Limitation of Liability</h2>
                        <p>
                            In no event shall Cabzi, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                        </p>
                        
                         <h2>7. Governing Law</h2>
                        <p>
                            These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions.
                        </p>

                        <h2>8. Changes</h2>
                        <p>
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page.
                        </p>

                        <h2>9. Contact Us</h2>
                        <p>If you have any questions about these Terms, please contact us at: <a href="mailto:support@cabzi.com">support@cabzi.com</a></p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
