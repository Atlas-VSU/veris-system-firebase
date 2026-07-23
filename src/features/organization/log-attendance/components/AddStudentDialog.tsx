import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoaderIcon, InfoIcon, UserPlusIcon } from "lucide-react";
import { Member } from "@/features/organization/members/types";
import { useAddStudentForm } from "../hooks/useAddStudentForm";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedId: string;
  onStudentAdded: (student: Member) => void;
}

export function AddStudentDialog({
  open,
  onOpenChange,
  suggestedId,
  onStudentAdded,
}: AddStudentDialogProps) {
  const {
    formData,
    consentChecked,
    setConsentChecked,
    showConsentError,
    setShowConsentError,
    isSubmitting,
    formErrors,
    handleChange,
    handleSubmit,
    programData,
    handleSelectChange,
  } = useAddStudentForm({ suggestedId, onStudentAdded, open, onOpenChange });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 bg-primary/10 text-primary rounded-full flex items-center justify-center shadow-soft shrink-0">
              <UserPlusIcon className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="font-serif text-base font-bold text-foreground">
                Add New Student
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Enter the student details to add them to the system.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Divider */}
        <div className="h-px w-full bg-border/40" />

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Student ID */}
          <div className="space-y-1.5">
            <Label
              htmlFor="studentId"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Student ID
            </Label>
            <Input
              id="studentId"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="XX-X-XXXXX"
            />
            {formErrors.studentId && (
              <p className="text-xs text-destructive">{formErrors.studentId}</p>
            )}
          </div>

          {/* First Name & Last Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="firstName"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                First Name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="e.g. John"
              />
              {formErrors.firstName && (
                <p className="text-xs text-destructive">{formErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="lastName"
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
              >
                Last Name
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="e.g. Doe"
              />
              {formErrors.lastName && (
                <p className="text-xs text-destructive">{formErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Email Address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="e.g. email@example.com"
            />
            {formErrors.email && (
              <p className="text-xs text-destructive">{formErrors.email}</p>
            )}
          </div>

          {/* Year Level (Optional) */}
          <div className="space-y-1.5">
            <Label
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Year Level (Optional)
            </Label>
            <Select
              onValueChange={(value) =>
                handleChange({
                  target: {
                    name: "yearLevel",
                    value: value === "0" ? "0" : value,
                  },
                } as React.ChangeEvent<HTMLInputElement>)
              }
              value={formData.yearLevel ? formData.yearLevel.toString() : "0"}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">None</SelectItem>
                <SelectItem value="1">1st Year</SelectItem>
                <SelectItem value="2">2nd Year</SelectItem>
                <SelectItem value="3">3rd Year</SelectItem>
                <SelectItem value="4">4th Year</SelectItem>
                <SelectItem value="5">5th Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Program */}
          <div className="space-y-1.5">
            <Label
              htmlFor="programId"
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              Program
            </Label>
            <Select
              value={formData.programId}
              onValueChange={handleSelectChange}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent>
                {programData.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.programId && (
              <p className="text-xs text-destructive">{formErrors.programId}</p>
            )}
          </div>

          {/* Consent */}
          <div className="rounded-2xl border border-border/40 bg-white/60 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={consentChecked}
                onCheckedChange={(checked) => {
                  setConsentChecked(checked as boolean);
                  if (checked) setShowConsentError(false);
                }}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="terms"
                  className="cursor-pointer font-sans text-sm font-bold text-foreground"
                >
                  I agree to the terms and conditions
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  By checking this box, I consent to the collection and
                  processing of personal information for attendance tracking
                  purposes.
                </p>
              </div>
            </div>
            {showConsentError && (
              <p className="text-xs text-destructive mt-2">
                You must agree to the terms to continue.
              </p>
            )}
          </div>

          {/* Privacy notice */}
          <Alert className="border border-border/40 bg-white/60 text-foreground rounded-2xl">
            <InfoIcon className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs text-muted-foreground">
              Your data will be used solely for attendance tracking and handled
              in accordance with our privacy policy.
            </AlertDescription>
          </Alert>

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-full cursor-pointer hover:scale-105"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              className="rounded-full cursor-pointer hover:scale-105"
            >
              {isSubmitting ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin text-primary-foreground" />
                  Adding...
                </>
              ) : (
                "Add Student"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
