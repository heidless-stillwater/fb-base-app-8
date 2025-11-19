'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import NanoProcessor from '@/components/nano-processor';

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
          <NanoProcessor />
        </CardContent>
      </Card>
    </div>
  );
}
