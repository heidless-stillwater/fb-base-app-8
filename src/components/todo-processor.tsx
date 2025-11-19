'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function TodoProcessor() {
  const [todoText, setTodoText] = useState('');
  const [processedTodos, setProcessedTodos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleProcessTodos = async () => {
    setIsLoading(true);
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const todos = todoText.split('\n').filter((todo) => todo.trim() !== '');
    setProcessedTodos(todos);
    setIsLoading(false);
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Your Todo Input</CardTitle>
          <CardDescription>Enter your tasks below, one per line. Then click the process button.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="e.g.&#10;Buy milk&#10;Walk the dog&#10;Learn Next.js"
            value={todoText}
            onChange={(e) => setTodoText(e.target.value)}
            rows={10}
            className="w-full"
          />
          <Button onClick={handleProcessTodos} disabled={isLoading || !todoText.trim()} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <span>{isLoading ? 'Processing...' : 'Process Todos'}</span>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Processed Todos</CardTitle>
          <CardDescription>This is where your processed todo list will appear.</CardDescription>
        </CardHeader>
        <CardContent>
          {processedTodos.length > 0 ? (
            <ul className="space-y-2">
              {processedTodos.map((todo, index) => (
                <li key={index} className="flex items-center rounded-md bg-muted p-3">
                  {todo}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center h-48 rounded-md border border-dashed text-sm text-muted-foreground">
              <p>Your processed todos will show up here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
