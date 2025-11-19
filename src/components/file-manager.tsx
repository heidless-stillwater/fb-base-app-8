"use client";

import React, { useState, useMemo, useRef, ChangeEvent } from "react";
import Image from "next/image";
import {
  Folder,
  File as FileIcon,
  MoreVertical,
  Upload,
  FolderPlus,
  Download,
  Trash2,
  Edit,
  ChevronRight,
  HomeIcon,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { format } from "date-fns";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export interface FileSystemNode {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  size?: number;
  lastModified: Date;
  content?: string;
  thumbnailUrl?: string;
}

const initialFilesData: FileSystemNode[] = [
  {
    id: "1",
    name: "Documents",
    type: "folder",
    path: "/",
    lastModified: new Date("2023-10-10T09:00:00"),
  },
  {
    id: "2",
    name: "Images",
    type: "folder",
    path: "/",
    lastModified: new Date("2023-10-12T14:30:00"),
  },
  {
    id: "3",
    name: "project-brief.pdf",
    type: "file",
    path: "/",
    size: 1572864,
    lastModified: new Date("2023-10-11T11:20:00"),
    content: "This is a dummy project brief PDF file.",
  },
  {
    id: "4",
    name: "vacation-photo.jpg",
    type: "file",
    path: "/Images",
    size: 4194304,
    lastModified: new Date("2023-09-28T18:45:00"),
    content: "This is a dummy vacation photo JPG file.",
    thumbnailUrl: "https://picsum.photos/seed/4/40/40"
  },
  {
    id: "5",
    name: "budget.xlsx",
    type: "file",
    path: "/Documents",
    size: 512000,
    lastModified: new Date("2023-10-09T16:05:00"),
    content: "This is a dummy budget XLSX file.",
  },
  {
    id: "6",
    name: "Client Proposal",
    type: "folder",
    path: "/Documents",
    lastModified: new Date("2023-10-10T09:00:00"),
  },
  {
    id: "7",
    name: "final-proposal.docx",
    type: "file",
    path: "/Documents/Client Proposal",
    size: 204800,
    lastModified: new Date("2023-10-10T10:00:00"),
    content: "This is a dummy final proposal DOCX file.",
  },
  {
    id: '8',
    name: 'sunset.png',
    type: 'file',
    path: '/Images',
    size: 2097152,
    lastModified: new Date('2023-10-15T19:20:00'),
    content: 'This is a dummy sunset PNG file.',
    thumbnailUrl: "https://picsum.photos/seed/8/40/40",
  },
];

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

type DialogState =
  | { type: "create_folder" }
  | { type: "rename"; node: FileSystemNode }
  | { type: "delete"; node: FileSystemNode }
  | null;

export default function FileManager() {
  const [nodes, setNodes] = useState<FileSystemNode[]>(initialFilesData);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [inputValue, setInputValue] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<
    { id: number; name: string; progress: number }[]
  >([]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPathString = useMemo(
    () => (currentPath.length === 0 ? "/" : `/${currentPath.join("/")}`),
    [currentPath]
  );

  const currentNodes = useMemo(() => {
    return nodes
      .filter((node) => node.path === currentPathString)
      .sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      });
  }, [nodes, currentPathString]);

  const handleNodeClick = (node: FileSystemNode) => {
    if (node.type === "folder") {
      setCurrentPath([...currentPath, node.name]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index));
  };

  const handleOpenDialog = (state: DialogState) => {
    if (state?.type === "rename") {
      setInputValue(state.node.name);
    } else {
      setInputValue("");
    }
    setDialogState(state);
  };

  const closeDialog = () => {
    setDialogState(null);
    setInputValue("");
  };

  const handleCreateFolder = () => {
    if (!inputValue.trim()) {
      toast({
        title: "Error",
        description: "Folder name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    const newNode: FileSystemNode = {
      id: new Date().toISOString(),
      name: inputValue,
      type: "folder",
      path: currentPathString,
      lastModified: new Date(),
    };
    setNodes([...nodes, newNode]);
    toast({
      title: "Success",
      description: `Folder "${inputValue}" created.`,
    });
    closeDialog();
  };

  const handleRenameNode = () => {
    if (dialogState?.type !== "rename") return;

    const originalNode = dialogState.node;
    const newName = inputValue;

    if (!newName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    
    const oldPathPrefix = originalNode.path === '/' ? `/${originalNode.name}` : `${originalNode.path}/${originalNode.name}`;
    const newPathPrefix = originalNode.path === '/' ? `/${newName}` : `${originalNode.path}/${newName}`;


    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === originalNode.id) {
          return { ...n, name: newName, lastModified: new Date() };
        }
        if (originalNode.type === 'folder' && n.path.startsWith(oldPathPrefix)) {
          const newPath = newPathPrefix + n.path.substring(oldPathPrefix.length);
          return { ...n, path: newPath };
        }
        return n;
      })
    );

    toast({
      title: "Success",
      description: `Renamed "${originalNode.name}" to "${newName}".`,
    });
    closeDialog();
  };

  const handleDeleteNode = () => {
    if (dialogState?.type !== "delete") return;
    const nodeToDelete = dialogState.node;
    
    setNodes((prevNodes) => {
        if (nodeToDelete.type === 'file') {
            return prevNodes.filter(n => n.id !== nodeToDelete.id);
        } else {
            const pathToDeletePrefix = nodeToDelete.path === '/' ? `/${nodeToDelete.name}` : `${nodeToDelete.path}/${nodeToDelete.name}`;
            return prevNodes.filter(n => n.id !== nodeToDelete.id && !n.path.startsWith(pathToDeletePrefix));
        }
    });

    toast({
      title: "Success",
      description: `Deleted "${nodeToDelete.name}".`,
    });
    closeDialog();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const uploadId = Date.now() + Math.random();
      const newUploadingFile = { id: uploadId, name: file.name, progress: 0 };
      setUploadingFiles((prev) => [...prev, newUploadingFile]);

      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;

        const interval = setInterval(() => {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId ? { ...f, progress: f.progress + 10 } : f
            )
          );
        }, 200);
  
        setTimeout(() => {
          clearInterval(interval);
          const newNode: FileSystemNode = {
            id: new Date().toISOString() + Math.random(),
            name: file.name,
            type: "file",
            path: currentPathString,
            size: file.size,
            lastModified: new Date(),
            content: content,
            thumbnailUrl: isImage ? content : undefined,
          };
          setNodes((prev) => [...prev, newNode]);
          setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
          toast({
            title: "Upload Complete",
            description: `File "${file.name}" has been uploaded.`,
          });
        }, 2000);
      }
      
      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
    
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleDownload = (node: FileSystemNode) => {
    if (node.type === 'file' && node.content) {
      const isDataUrl = node.content.startsWith('data:');
      
      if (isDataUrl) {
        const a = document.createElement('a');
        a.href = node.content;
        a.download = node.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const blob = new Blob([node.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = node.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast({
        title: "Download Started",
        description: `Downloading "${node.name}".`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: "Download Failed",
        description: `"${node.name}" has no content to download.`,
      });
    }
  };

  const dialogContent = useMemo(() => {
    if (!dialogState) return null;

    if (dialogState.type === "delete") {
      return (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{dialogState.node.name}"
              {dialogState.node.type === 'folder' && ' and all its contents'}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNode} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      );
    }

    const isRename = dialogState.type === 'rename';
    const title = isRename ? `Rename "${dialogState.node.name}"` : 'Create New Folder';

    return (
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="col-span-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  isRename ? handleRenameNode() : handleCreateFolder();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>Cancel</Button>
          <Button onClick={isRename ? handleRenameNode : handleCreateFolder}>
            {isRename ? 'Rename' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    );
  }, [dialogState, inputValue]);

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Cloud Storage</CardTitle>
            <CardDescription>Manage your files and folders.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog({ type: 'create_folder' })}>
              <FolderPlus className="mr-2 h-4 w-4" /> New Folder
            </Button>
            <Button onClick={handleUploadClick} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
              accept="image/*,text/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 overflow-x-auto whitespace-nowrap py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleBreadcrumbClick(0)}
              disabled={currentPath.length === 0}
            >
              <HomeIcon className="h-4 w-4" />
            </Button>
            {currentPath.length > 0 && <ChevronRight className="h-4 w-4" />}
            {currentPath.map((part, index) => (
              <React.Fragment key={index}>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => handleBreadcrumbClick(index + 1)}
                  disabled={index === currentPath.length - 1}
                >
                  {part}
                </Button>
                {index < currentPath.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[80px]">Thumbnail</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell w-[150px]">
                    Size
                  </TableHead>
                  <TableHead className="hidden sm:table-cell w-[200px]">
                    Last Modified
                  </TableHead>
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentNodes.map((node) => (
                  <TableRow
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => handleNodeClick(node)}
                  >
                    <TableCell className="text-muted-foreground">
                      {node.type === "folder" ? (
                        <Folder />
                      ) : (
                        <FileIcon />
                      )}
                    </TableCell>
                    <TableCell>
                      {node.type === 'file' && node.thumbnailUrl ? (
                        <Image src={node.thumbnailUrl} alt={node.name} width={40} height={40} className="rounded-md object-cover" />
                      ) : node.type === 'file' ? (
                        <div className="w-10 h-10 flex items-center justify-center bg-muted rounded-md">
                          <ImageIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      ) : <div className="w-10 h-10"></div>}
                    </TableCell>
                    <TableCell className="font-medium">{node.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {node.type === "file" && node.size
                        ? formatBytes(node.size)
                        : ""}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {format(node.lastModified, "PPp")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {node.type === "file" && (
                            <DropdownMenuItem
                              onSelect={() => handleDownload(node)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => handleOpenDialog({ type: "rename", node })}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => handleOpenDialog({ type: "delete", node })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {uploadingFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </TableCell>
                    <TableCell colSpan={5}>
                      <div className="flex items-center gap-4">
                        <span className="font-medium flex-1 truncate">{file.name}</span>
                        <Progress value={file.progress} className="w-32" />
                        <span className="text-sm text-muted-foreground w-12 text-right">{file.progress}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                 {currentNodes.length === 0 && uploadingFiles.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            This folder is empty.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={!!dialogState && dialogState.type !== 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        {dialogContent}
      </Dialog>
      <AlertDialog open={!!dialogState && dialogState.type === 'delete'} onOpenChange={(isOpen) => !isOpen && closeDialog()}>
        {dialogContent}
      </AlertDialog>
    </>
  );
}
