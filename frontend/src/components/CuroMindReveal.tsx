
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Sparkles } from 'lucide-react';

const CuroMindReveal = () => {
  return (
    <section className="py-20 md:py-24 bg-background">
      <div className="container">
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex w-fit items-center justify-center rounded-full bg-primary/10 p-3 mb-4">
                <BrainCircuit className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Meet CuroMind</CardTitle>
            <CardDescription className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              The AI engine powering the Curocity ecosystem. From smart dispatch to a personalized earnings coach, CuroMind works behind the scenes to create a safer, more efficient experience for everyone.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center mt-4">
            <Button variant="outline">
                Learn More About Our AI <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default CuroMindReveal;
