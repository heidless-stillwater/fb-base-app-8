'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Upload, Wand2, Download, History, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useStorage } from '@/firebase';

export default function NanoProcessor() {
  const [originalImage, setOriginalImage] = useState<{ url: string; file: File } | null>(null);
  const [transformedImage, setTransformedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useUser();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload an image file.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage({ url: reader.result as string, file });
        setTransformedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleTransform = async () => {
      if (!originalImage || !prompt.trim() || !user) {
          toast({
              variant: 'destructive',
              title: 'Missing Information',
              description: 'Please upload an image and enter a prompt.',
          });
          return;
      }
      setIsLoading(true);
      setError(null);
      
      // Placeholder for AI transformation logic
      setTimeout(() => {
        setTransformedImage(originalImage.url); // For now, just copy the original
        setIsLoading(false);
        toast({
            title: 'Transformation Complete!',
            description: 'This is a placeholder. AI logic coming soon.'
        });
      }, 2000);
  };
  
  const clearState = () => {
    setOriginalImage(null);
    setTransformedImage(null);
    setPrompt('');
    setError(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <Card>
        <CardHeader>
          <CardTitle>1. Upload & Prompt</CardTitle>
          <CardDescription>Select an image and tell the AI how to change it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="image-upload">Original Image</Label>
            <div className="relative border-2 border-dashed border-muted rounded-lg p-4 text-center cursor-pointer hover:border-primary" onClick={() => fileInputRef.current?.click()}>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              {originalImage ? (
                <div className='relative'>
                    <Image src={originalImage.url} alt="Original image" width={400} height={400} className="rounded-md mx-auto max-h-60 w-auto" />
                    <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={(e) => { e.stopPropagation(); clearState(); }}><X className="h-4 w-4" /></Button>
                </div>

              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="h-8 w-8" />
                  <span>Click to upload or drag & drop</span>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt">Transformation Prompt</Label>
            <Input
              id="prompt"
              placeholder="e.g., make the sky purple, add a dragon"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading || !originalImage}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleTransform} disabled={isLoading || !originalImage || !prompt.trim()}>
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Transform Image
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. View Result</CardTitle>
          <CardDescription>Your transformed image will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-square border-2 border-dashed border-muted rounded-lg flex items-center justify-center bg-muted/50">
            {isLoading && <Loader2 className="h-12 w-12 animate-spin text-primary" />}
            {!isLoading && transformedImage && (
              <Image src={transformedImage} alt="Transformed image" width={500} height={500} className="rounded-md max-h-full w-auto" />
            )}
            {!isLoading && !transformedImage && !error && (
              <p className="text-muted-foreground">Awaiting transformation...</p>
            )}
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Transformation Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className='flex justify-between'>
            <Button disabled={!transformedImage || isLoading}>
                <Download className='mr-2 h-4 w-4'/>
                Save Image
            </Button>
            <Button variant="outline" disabled={isLoading}>
                <History className='mr-2 h-4 w-4'/>
                View History
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
