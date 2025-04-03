"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Database, ArrowRight, Settings, Trash2, Edit, RefreshCw } from "lucide-react";
import { useDatabaseStore } from "@/store/database-store";
import DatabaseForm from "@/components/dashboard/database-form";
import { Database as DatabaseType } from "@/lib/types/chat";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("databases");
  const [databaseDialogOpen, setDatabaseDialogOpen] = useState(false);
  const [editingDatabase, setEditingDatabase] = useState<DatabaseType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [databaseToDelete, setDatabaseToDelete] = useState<number | null>(null);

  const { 
    databases, 
    fetchDatabases, 
    deleteConnection,
    isLoading 
  } = useDatabaseStore();

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  // Handle database deletion
  const handleDeleteDatabase = async () => {
    if (databaseToDelete === null) return;

    try {
      const success = await deleteConnection(databaseToDelete);
      if (success) {
        toast.success("Database connection deleted successfully");
        setDeleteDialogOpen(false);
        setDatabaseToDelete(null);
      } else {
        toast.error("Failed to delete database connection");
      }
    } catch (error) {
      toast.error(`Error deleting database: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // Handle database edit
  const handleEditDatabase = (database: DatabaseType) => {
    setEditingDatabase(database);
    setDatabaseDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setDatabaseDialogOpen(false);
    setEditingDatabase(null);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your databases and queries
        </p>
      </header>

      <Tabs defaultValue="databases" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="databases">Databases</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {activeTab === "databases" && (
            <Dialog open={databaseDialogOpen} onOpenChange={setDatabaseDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Database
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingDatabase ? "Edit Database Connection" : "Add New Database Connection"}
                  </DialogTitle>
                </DialogHeader>
                <DatabaseForm 
                  existingDatabase={editingDatabase} 
                  onSuccess={handleDialogClose} 
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <TabsContent value="databases" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : databases.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Database className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">No databases yet</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-md">
                Connect to your databases to start querying them with natural language.
              </p>
              <Dialog open={databaseDialogOpen} onOpenChange={setDatabaseDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Database
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Add New Database Connection</DialogTitle>
                  </DialogHeader>
                  <DatabaseForm onSuccess={handleDialogClose} />
                </DialogContent>
              </Dialog>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {databases.map((database) => (
                <Card key={database.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="line-clamp-1">
                          {database.connectionName || database.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          {database.dbType.toUpperCase()}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={database.isConnected ? "default" : "outline"}
                        className="capitalize"
                      >
                        {database.isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-muted-foreground">Host:</div>
                      <div className="font-medium truncate">{database.host}</div>
                      <div className="text-muted-foreground">Database:</div>
                      <div className="font-medium truncate">{database.dbName}</div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-3 flex justify-between items-center">
                    <Button variant="outline" asChild>
                      <Link href={`/chat?db=${database.id}`}>
                        Query
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditDatabase(database)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          setDatabaseToDelete(database.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Queries</CardTitle>
              <CardDescription>
                Your recent database queries and conversations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-6 text-muted-foreground">
                Query history will be shown here once you start querying your databases.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Theme</h3>
                    <select className="w-full p-2 border rounded">
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Language</h3>
                    <select className="w-full p-2 border rounded">
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-2">Notifications</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      Email notifications
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      Query completion alerts
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Database Connection</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this database connection? This action cannot be undone.</p>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDatabase}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}