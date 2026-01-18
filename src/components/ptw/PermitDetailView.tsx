import React, { useState, useEffect } from 'react';
import type { Ptw, User, PtwSafetyRequirement, PtwLiftingPayload, PtwHotWorkPayload, PtwConfinedSpacePayload, PtwWorkAtHeightPayload } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useAppContext } from '../../contexts';
import { usePtwWorkflow } from '../../contexts/PtwWorkflowContext'; // FIX: Import from specific context file
import { WorkAtHeightPermit } from '../WorkAtHeightPermit';
import { useToast } from '../ui/Toast';
import { ActionsBar } from '../ui/ActionsBar';
import { EmailModal } from '../ui/EmailModal';
import { LoadCalculationSection } from '../LoadCalculationSection';
import { GasTestLogSection } from '../GasTestLogSection';
import { PersonnelEntryLogSection } from '../PersonnelEntryLogSection';
import { Activity } from 'lucide-react'; // FIX: Import Activity icon

interface PermitDetailViewProps {
  ptw: Ptw;
  onClose: () => void;
  onUpdate: (ptw: Ptw, action?: any) => void;
}

// ... (Rest of the file content, ensuring 'orange' is changed to 'amber' in Badge colors)

// Example fix for Badge color:
// <Badge color={activity.priority === 'high' ? 'red' : activity.priority === 'medium' ? 'amber' : 'green'} size="sm">