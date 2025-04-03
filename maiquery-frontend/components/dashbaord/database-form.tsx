// components/dashboard/database-form.tsx
"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useDatabaseStore } from "@/store/database-store";
import { toast } from "sonner";

// Define form validation schema
const databaseFormSchema = z.object({
  connectionName: z.string().min(1, "Connection name is required"),
  dbType: z.string().min(1, "Database type is required"),
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1, "Port must be a positive number"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  dbName: z.string().min(1, "Database name is required"),
});

type DatabaseFormValues = z.infer<typeof databaseFormSchema>;

interface DatabaseFormProps {
  existingDatabase?: any;
  onSuccess?: () => void;
}

const DatabaseForm: React.FC<DatabaseFormProps> = ({
  existingDatabase,
  onSuccess,
}) => {
  const [testLoading, setTestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const testConnection = useDatabaseStore((state) => state.testConnection);
  const createConnection = useDatabaseStore((state) => state.createConnection);
  const updateConnection = useDatabaseStore((state) => state.updateConnection);

  // Initialize form with existing values or defaults
  const defaultValues: Partial<DatabaseFormValues> = {
    connectionName: existingDatabase?.connectionName || "",
    dbType: existingDatabase?.dbType || "postgres",
    host: existingDatabase?.host || "localhost",
    port: existingDatabase?.port || 5432,
    username: existingDatabase?.username || "",
    password: existingDatabase?.password || "",
    dbName: existingDatabase?.dbName || "",
  };

  const form = useForm<DatabaseFormValues>({
    resolver: zodResolver(databaseFormSchema),
    defaultValues,
  });

  // Handle form submission
  const onSubmit = async (values: DatabaseFormValues) => {
    setSaveLoading(true);
    try {
      if (existingDatabase) {
        // Update existing connection
        await updateConnection(existingDatabase.id, values);
        toast.success("Database connection updated successfully");
      } else {
        // Create new connection
        await createConnection(values);
        form.reset(); // Clear form on successful creation
        toast.success("Database connection created successfully");
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(`Failed to ${existingDatabase ? "update" : "create"} connection: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle connection test
  const handleTestConnection = async () => {
    const formData = form.getValues();
    const isValid = await form.trigger();

    if (!isValid) {
      return;
    }

    setTestLoading(true);
    try {
      const result = await testConnection(formData);
      if (result.success) {
        toast.success("Connection test successful!");
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error) {
      toast.error(`Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="connectionName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection Name</FormLabel>
              <FormControl>
                <Input placeholder="My Database" {...field} />
              </FormControl>
              <FormDescription>
                A friendly name to identify this connection
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dbType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select database type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="postgres">PostgreSQL</SelectItem>
                  <SelectItem value="mysql">MySQL</SelectItem>
                  <SelectItem value="mssql">Microsoft SQL Server</SelectItem>
                  <SelectItem value="sqlite">SQLite</SelectItem>
                  <SelectItem value="mongodb">MongoDB</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                The type of database you want to connect to
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                  <Input placeholder="localhost" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="5432"
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      field.onChange(isNaN(value) ? "" : value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="username" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dbName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database Name</FormLabel>
              <FormControl>
                <Input placeholder="mydatabase" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button 
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testLoading}
          >
            {testLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <Button 
            type="submit"
            disabled={saveLoading}
          >
            {saveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingDatabase ? "Update" : "Create"} Connection
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default DatabaseForm;