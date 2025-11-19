'use client';

import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NanoRecord {
  id: string;
  originalImageUrl: string;
  transformedImageUrl: string;
  originalFileName: string;
  timestamp: {
    seconds: number;
    nanoseconds: number;
  };
}

export default function NanoGallery() {
  const { user } = useUser();
  const firestore = useFirestore();

  const nanoRecordsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(firestore, `users/${user.uid}/nanoRecords`),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);

  const {
    data: records,
    isLoading: recordsLoading,
    error,
  } = useCollection<NanoRecord>(nanoRecordsQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transformation History</CardTitle>
        <CardDescription>
          A gallery of your past image transformations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recordsLoading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        {error && (
          <div className="text-destructive text-center">
            Error loading gallery: {error.message}
          </div>
        )}
        {!recordsLoading && !records?.length && (
          <div className="flex items-center justify-center h-48 rounded-md border border-dashed text-sm text-muted-foreground">
            <p>Your transformation history is empty.</p>
          </div>
        )}
        {!recordsLoading && records && records.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map((record) => (
              <div
                key={record.id}
                className="group border rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-center gap-2 p-4 bg-muted/50">
                  <div className="w-1/2 aspect-square relative">
                    <Image
                      src={record.originalImageUrl}
                      alt="Original"
                      fill
                      sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 15vw"
                      className="object-cover rounded-md"
                    />
                    <div className="absolute bottom-1 right-1 bg-background/70 text-xs px-1.5 py-0.5 rounded">
                      Original
                    </div>
                  </div>
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                  <div className="w-1/2 aspect-square relative">
                    <Image
                      src={record.transformedImageUrl}
                      alt="Transformed"
                      fill
                      sizes="(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 15vw"
                      className="object-cover rounded-md"
                    />
                     <div className="absolute bottom-1 right-1 bg-background/70 text-xs px-1.5 py-0.5 rounded">
                      Transformed
                    </div>
                  </div>
                </div>
                <div className="p-3 text-sm">
                  <p className="font-medium truncate" title={record.originalFileName}>{record.originalFileName}</p>
                  <p className="text-muted-foreground text-xs">
                    {record.timestamp
                      ? formatDistanceToNow(
                          new Date(record.timestamp.seconds * 1000),
                          { addSuffix: true }
                        )
                      : 'Just now'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
