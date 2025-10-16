
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import BrandLogo from '@/components/brand-logo'
import Link from 'next/link'
import { ArrowLeft, User, Car, Languages, Wrench, Ambulance } from 'lucide-react'
import { useLanguage } from '@/hooks/use-language'


export default function SurveyPage() {
    const [step, setStep] = useState<'language' | 'role' | 'partner_role' | 'details' | 'questions'>('language');
    const [userType, setUserType] = useState<'rider' | 'partner' | null>(null)
    const [partnerType, setPartnerType] = useState<'driver' | 'mechanic' | null>(null);
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()
    const { language, setLanguage, t } = useLanguage();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [age, setAge] = useState('');
    const [location, setLocation] = useState('');

    const riderQuestions = [
        { id: 'q1_rider', question: t('survey_rider_q1'), options: t('survey_rider_q1_options').split('|'), },
        { id: 'q2_rider', question: t('survey_rider_q2'), options: t('survey_rider_q2_options').split('|'), },
        { id: 'q3_rider', question: t('survey_rider_q3'), options: t('survey_rider_q3_options').split('|'), },
        { id: 'q4_rider', question: t('survey_rider_q4'), options: t('survey_rider_q4_options').split('|'), },
        { id: 'q5_rider', question: t('survey_rider_q5'), options: t('survey_rider_q5_options').split('|'), },
        { id: 'q6_rider', question: t('survey_rider_q6'), options: t('survey_rider_q6_options').split('|'), },
        { id: 'q7_rider', question: t('survey_rider_q7'), options: t('survey_rider_q7_options').split('|'), },
        { id: 'q8_rider', question: t('survey_rider_q8'), options: t('survey_rider_q8_options').split('|'), },
        { id: 'q9_rider', question: t('survey_rider_q9'), options: t('survey_rider_q9_options').split('|'), },
        { id: 'q10_rider', question: t('survey_rider_q10'), options: t('survey_rider_q10_options').split('|'), },
    ];

    const partnerQuestions = [
        { id: 'q1_partner', question: t('survey_partner_q1'), options: t('survey_partner_q1_options').split('|'), },
        { id: 'q2_partner', question: t('survey_partner_q2'), options: t('survey_partner_q2_options').split('|'), },
        { id: 'q3_partner', question: t('survey_partner_q3'), options: t('survey_partner_q3_options').split('|'), },
        { id: 'q4_partner', question: t('survey_partner_q4'), options: t('survey_partner_q4_options').split('|'), },
        { id: 'q5_partner', question: t('survey_partner_q5'), options: t('survey_partner_q5_options').split('|'), },
        { id: 'q6_partner', question: t('survey_partner_q6'), options: t('survey_partner_q6_options').split('|'), },
        { id: 'q7_partner', question: t('survey_partner_q7'), options: t('survey_partner_q7_options').split('|'), },
        { id: 'q8_partner', question: t('survey_partner_q8'), options: t('survey_partner_q8_options').split('|'), },
        { id: 'q9_partner', question: t('survey_partner_q9'), options: t('survey_partner_q9_options').split('|'), },
        { id: 'q10_partner', question: t('survey_partner_q10'), options: t('survey_partner_q10_options').split('|'), },
    ];

    const mechanicQuestions = [
        { id: 'q1_mechanic', question: t('survey_mechanic_q1'), options: t('survey_mechanic_q1_options').split('|'), },
        { id: 'q2_mechanic', question: t('survey_mechanic_q2'), options: t('survey_mechanic_q2_options').split('|'), },
        { id: 'q3_mechanic', question: t('survey_mechanic_q3'), options: t('survey_mechanic_q3_options').split('|'), },
        { id: 'q4_mechanic', question: t('survey_mechanic_q4'), options: t('survey_mechanic_q4_options').split('|'), },
        { id: 'q5_mechanic', question: t('survey_mechanic_q5'), options: t('survey_mechanic_q5_options').split('|'), },
        { id: 'q6_mechanic', question: t('survey_mechanic_q6'), options: t('survey_mechanic_q6_options').split('|'), },
        { id: 'q7_mechanic', question: t('survey_mechanic_q7'), options: t('survey_mechanic_q7_options').split('|'), },
        { id: 'q8_mechanic', question: t('survey_mechanic_q8'), options: t('survey_mechanic_q8_options').split('|'), },
        { id: 'q9_mechanic', question: t('survey_mechanic_q9'), options: t('survey_mechanic_q9_options').split('|'), },
        { id: 'q10_mechanic', question: t('survey_mechanic_q10'), options: t('survey_mechanic_q10_options').split('|'), },
    ]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        
        // In a real app, you'd save the form data to a database here.
        
        setTimeout(() => {
            toast({
                title: t('survey_toast_thanks_title'),
                description: t('survey_toast_thanks_desc'),
                className: "bg-green-600 text-white border-green-600"
            })
            setIsLoading(false)
            setStep('language');
            setUserType(null);
            setPartnerType(null);
        }, 1500)
    }
    
    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name || !phone || !age || !location) {
            toast({
                variant: "destructive",
                title: "All fields are required",
                description: "Please fill in all your details to proceed.",
            });
            return;
        }
        setStep('questions');
    }

    const handleLanguageSelect = (lang: 'en' | 'hi') => {
        setLanguage(lang);
        setStep('role');
    }
    
    const handleRoleSelect = (role: 'rider' | 'partner') => {
        setUserType(role);
        if (role === 'rider') {
            setStep('details');
        } else {
            setStep('partner_role');
        }
    }
    
    const handlePartnerTypeSelect = (type: 'driver' | 'mechanic') => {
        setPartnerType(type);
        setStep('details');
    }

    const handleCurePartnerClick = () => {
        toast({
            title: t('toast_survey_coming_soon_title'),
            description: t('toast_survey_coming_soon_desc'),
        })
    }

    const renderLanguageSelection = () => (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto text-primary">
                    <Languages className="w-12 h-12" />
                </div>
                <CardTitle className="text-3xl mt-4">Choose Language / भाषा चुनें</CardTitle>
                <CardDescription>
                    Please select your preferred language.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleLanguageSelect('en')}>
                    English
                </Button>
                <Button variant="outline" size="lg" className="h-20 text-lg" onClick={() => handleLanguageSelect('hi')}>
                    हिन्दी
                </Button>
            </CardContent>
             <CardFooter>
                 <Button asChild variant="link" className="w-full text-muted-foreground">
                    <Link href="/" legacyBehavior>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Go back to Home
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );

    const renderRoleSelection = () => (
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto">
                    <BrandLogo className="text-5xl justify-center" />
                </div>
                <CardTitle className="text-3xl mt-4">{t('survey_title')}</CardTitle>
                <CardDescription>
                    {t('survey_role_desc')}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="outline" size="lg" className="h-24 text-base flex-col gap-2" onClick={() => handleRoleSelect('rider')}>
                    <User className="w-6 h-6"/>
                    {t('survey_role_rider')}
                </Button>
                <Button variant="outline" size="lg" className="h-24 text-base flex-col gap-2" onClick={() => handleRoleSelect('partner')}>
                   <Car className="w-6 h-6"/>
                   {t('survey_role_partner')}
                </Button>
            </CardContent>
             <CardFooter>
                 <Button variant="link" className="w-full text-muted-foreground" onClick={() => setStep('language')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('survey_back_to_lang')}
                </Button>
            </CardFooter>
        </Card>
    );

    const renderPartnerRoleSelection = () => (
        <Card className="w-full max-w-2xl text-center">
             <CardHeader>
                <CardTitle className="text-3xl">What kind of partner are you?</CardTitle>
                <CardDescription>This will help us ask you the right questions.</CardDescription>
             </CardHeader>
             <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <Card className="p-4 flex flex-col items-center justify-center gap-4 hover:bg-muted cursor-pointer" onClick={() => handlePartnerTypeSelect('driver')}>
                    <Car className="w-12 h-12 text-primary" />
                    <h3 className="font-semibold text-lg">Cabzi Partner (Driver)</h3>
                 </Card>
                  <Card className="p-4 flex flex-col items-center justify-center gap-4 hover:bg-muted cursor-pointer" onClick={() => handlePartnerTypeSelect('mechanic')}>
                    <Wrench className="w-12 h-12 text-primary" />
                    <h3 className="font-semibold text-lg">ResQ Partner (Mechanic)</h3>
                 </Card>
                  <Card className="p-4 flex flex-col items-center justify-center gap-4 hover:bg-muted cursor-pointer border-dashed" onClick={handleCurePartnerClick}>
                    <Ambulance className="w-12 h-12 text-destructive" />
                    <h3 className="font-semibold text-lg">{t('survey_role_cure_partner')}</h3>
                    <p className="text-xs text-muted-foreground">{t('survey_role_cure_partner_desc')}</p>
                 </Card>
             </CardContent>
              <CardFooter>
                 <Button variant="link" className="w-full text-muted-foreground" onClick={() => setStep('role')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Role Selection
                </Button>
            </CardFooter>
        </Card>
    );
    
    const renderDetailsForm = () => (
        <Card className="w-full max-w-lg">
             <CardHeader className="text-center">
                <CardTitle className="text-3xl">
                    Tell Us About Yourself
                </CardTitle>
                <CardDescription>
                   This information helps us to better understand your feedback.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleDetailsSubmit}>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="age">Age</Label>
                            <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">Your City (Location)</Label>
                        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Delhi" required />
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <Button type="submit" className="w-full">
                        Next
                    </Button>
                    <Button variant="link" className="text-muted-foreground" onClick={() => userType === 'rider' ? setStep('role') : setStep('partner_role')}>
                       <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );

    const renderForm = () => {
        const questions = userType === 'rider' 
            ? riderQuestions 
            : (partnerType === 'driver' ? partnerQuestions : mechanicQuestions);
        
        let titleKey = 'survey_rider_title';
        if (userType === 'partner') {
            titleKey = partnerType === 'driver' ? 'survey_partner_title' : 'survey_mechanic_title';
        }

        return (
            <Card className="w-full max-w-2xl">
                 <CardHeader className="text-center">
                    <CardTitle className="text-3xl">
                        {t(titleKey)}
                    </CardTitle>
                    <CardDescription>
                       {t('survey_form_desc')}
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-8">
                        {questions.map((q) => (
                            <div key={q.id} className="space-y-3">
                                <Label className="text-base font-semibold">{q.question}</Label>
                                <RadioGroup defaultValue={q.options[0]} className="flex flex-col gap-2">
                                    {q.options.map((opt, index) => (
                                        <div key={index} className="flex items-center space-x-2 p-3 bg-muted/50 rounded-md">
                                            <RadioGroupItem value={opt} id={`${q.id}_${index}`} />
                                            <Label htmlFor={`${q.id}_${index}`} className="font-normal cursor-pointer">{opt}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button type="submit" className="w-full btn-glow bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
                            {isLoading ? t('survey_button_submitting') : t('survey_button_submit')}
                        </Button>
                        <Button variant="link" className="text-muted-foreground" onClick={() => setStep('details')}>
                           <ArrowLeft className="mr-2 h-4 w-4" /> Back to Details
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
           {step === 'language' && renderLanguageSelection()}
           {step === 'role' && renderRoleSelection()}
           {step === 'partner_role' && renderPartnerRoleSelection()}
           {step === 'details' && renderDetailsForm()}
           {step === 'questions' && renderForm()}
        </div>
    )
}
