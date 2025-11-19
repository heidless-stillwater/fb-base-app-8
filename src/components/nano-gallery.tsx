'use client';

import { useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, MoreVertical, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

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

  const handleDownload = async (imageUrl: string, fileName: string) => {
    try {
      toast({
        title: 'Download Started',
        description: `Downloading "${fileName}".`,
      });

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: `Could not download "${fileName}". See console for details.`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transformation History</CardTitle>
        <CardDescription>
          A gallery of your past image transformations. Click an item to select it.
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
                className={cn(
                  'group border rounded-lg overflow-hidden cursor-pointer transition-all',
                  selectedRecordId === record.id
                    ? 'ring-2 ring-primary ring-offset-2'
                    : 'hover:border-primary/50'
                )}
                onClick={() => setSelectedRecordId(record.id)}
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
                <div className="p-3 text-sm flex justify-between items-start">
                  <div>
                    <p
                      className="font-medium truncate"
                      title={record.originalFileName}
                    >
                      {record.originalFileName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {record.timestamp
                        ? formatDistanceToNow(
                            new Date(record.timestamp.seconds * 1000),
                            { addSuffix: true }
                          )
                        : 'Just now'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onSelect={() =>
                          handleDownload(
                            record.originalImageUrl,
                            `original-${record.originalFileName}`
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Original
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          handleDownload(
                            record.transformedImageUrl,
                            `transformed-${record.originalFileName}`
                          )
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download Transformed
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
