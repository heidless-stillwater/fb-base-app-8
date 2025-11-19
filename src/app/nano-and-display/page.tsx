'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function NanoAndDisplayPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 h-full">
      <Card>
        <CardHeader>
          <CardTitle>Image Transformation</CardTitle>
          <CardDescription>
            Upload an image and use AI to transform it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
