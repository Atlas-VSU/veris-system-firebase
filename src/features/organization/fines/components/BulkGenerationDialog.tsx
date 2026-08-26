import { AlertTriangle, CheckCircle, Clock, Upload, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { createBulkFines } from "@/firebase/fines/create/fines";
import { useState } from "react";
import { toast } from "sonner";
import { BulkFinesProgress } from "../types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTermPeriod } from "../../term/hooks/useTermPeriod";

interface BulkGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkGenerationDialog({ open, onOpenChange, onSuccess }: BulkGenerationDialogProps) {
  const { selected } = useTermPeriod();
  const [progress, setProgress] = useState<BulkFinesProgress | null>(null);

  const handleClose = () => {
    if (isRunning) return;
    if (isDone && onSuccess) {
      onSuccess();
    }
    setProgress(null);       // reset so next open starts fresh
    onOpenChange(false);
  };

  const handleCreate = async () => {
    if (!selected?.isActive) {
      toast.error("Cannot generate fines for an inactive academic term.");
      return;
    }
    const result = await createBulkFines(
      (update) => setProgress(update)
    );

    if (!result.success) {
      toast.error(`Failed at batch ${result.failedAtBatch}. ${result.committed} records were saved.`);
    }
  };

  const pct = progress?.totalUsers
    ? Math.round((progress.committed / progress.totalUsers) * 100)
    : 0;

  const isRunning = progress?.phase === "preflight" || progress?.phase === "writing";
  const isDone    = progress?.phase === "done";
  const isError   = progress?.phase === "error";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[90vw] overflow-y-auto max-h-[90vh] py-8">
        <DialogHeader>
          <DialogTitle>Initialize Student Fine Records</DialogTitle>
          <DialogDescription>
            This is a necessary step to initialize fine tracking records for all registered students for the current term. It enables you to view the student fine roster, manage clearances, and issue new fines.
          </DialogDescription>
        </DialogHeader>

        {!selected?.isActive && !isRunning && !isDone && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-semibold text-amber-800 dark:text-amber-300">Inactive Academic Term</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
              Fine generation is disabled because the selected term is inactive. Please switch to an active academic term.
            </AlertDescription>
          </Alert>
        )}

        {isRunning && progress && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Initializing Fine Records
                </CardTitle>
                <CardDescription>
                  Processing {progress.totalUsers.toLocaleString()} users in batches of 20.
                  This may take a few minutes. Please do not close this dialog.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{progress.message}</span>
                  <span className="text-muted-foreground">{pct}% complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {progress.batchNum && progress.totalBatches && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Batch {progress.batchNum} of {progress.totalBatches}</span>
                    <span>{progress.committed.toLocaleString()} records written</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4 mt-2">
                  <div>
                    <span className="text-muted-foreground">Total users</span>
                    <p className="font-medium">{progress.totalUsers.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Batch size</span>
                    <p className="font-medium">20</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Committed</span>
                    <p className="font-medium">{progress.committed.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining</span>
                    <p className="font-medium">
                      {(progress.totalUsers - progress.committed).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isDone && progress && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Generation Complete
                </CardTitle>
                <CardDescription>
                  All fine documents have been created successfully.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total written</span>
                    <p className="font-medium">{progress.committed.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <p className="font-medium text-green-600">Success</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isError && progress && (
          <div className="space-y-6 py-4">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Generation Failed
                </CardTitle>
                <CardDescription>{progress.message}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Committed before failure</span>
                    <p className="font-medium">{progress.committed.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Not written</span>
                    <p className="font-medium text-red-600">
                      {(progress.totalUsers - progress.committed).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isRunning}>
            {!isDone? "Cancel" : "Close"}
          </Button>
            {!isDone &&(
            <div>
            <LoadingButton 
              variant="success" 
              onClick={handleCreate}
              isLoading={isRunning}
              disabled={!selected?.isActive}
              loadingText="Initializing..."
            >
              <Upload className="h-4 w-4 mr-2" />
              Initialize Records
            </LoadingButton>
          </div>  
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}