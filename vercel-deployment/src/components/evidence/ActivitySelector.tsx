import React from 'react';
import { ACTIVITY_TYPES, ACTIVITY_TYPE_ICONS, ACTIVITY_TYPE_LABELS } from '@constants/activityTypes';

interface EvidenceStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ id: string; label: string }>;
}

export function EvidenceStepIndicator({ currentStep, totalSteps, steps }: EvidenceStepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div
            className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors ${
              index < currentStep
                ? 'bg-primary-500 text-white'
                : index === currentStep
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {index < currentStep ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-1 w-12 mx-2 transition-colors ${
                index < currentStep ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function ActivitySelector({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ACTIVITY_TYPES.map((type) => {
        const Icon = ACTIVITY_TYPE_ICONS[type];
        return (
          <button
            key={type}
            onClick={() => !disabled && onChange(type)}
            disabled={disabled}
            className={`relative p-4 border-2 rounded-xl transition-all text-left ${
              value === type
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300 disabled:opacity-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{ACTIVITY_TYPE_LABELS[type]}</p>
              </div>
            </div>
            {value === type && (
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary-500 flex items-center justify-center">
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function EvidenceReview({
  activityType,
  description,
  location,
  mediaFiles,
}: {
  activityType: string;
  description: string;
  location: { latitude: number; longitude: number } | null;
  mediaFiles: File[];
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Activity</p>
        <p className="font-medium">{ACTIVITY_TYPE_LABELS[activityType as keyof typeof ACTIVITY_TYPE_LABELS] ?? activityType}</p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Description</p>
        <p className="font-medium">{description}</p>
      </div>

      {location && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">Location</p>
          <p className="font-mono text-sm">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Media Files</p>
        <p className="font-medium">{mediaFiles.length} file(s)</p>
      </div>
    </div>
  );
}

export function EvidenceStatus({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Uploading: 'bg-blue-100 text-blue-700',
    Submitted: 'bg-indigo-100 text-indigo-700',
    Processing: 'bg-yellow-100 text-yellow-700',
    PendingAnchor: 'bg-orange-100 text-orange-700',
    Anchored: 'bg-purple-100 text-purple-700',
    VerificationPending: 'bg-cyan-100 text-cyan-700',
    Verified: 'bg-green-100 text-green-700',
    IntegrityMismatch: 'bg-red-100 text-red-700',
    Failed: 'bg-red-100 text-red-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export function EvidenceTimeline({ events }: { events: Array<{ timestamp: string; action: string; user: string; details?: string }> }) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${
                index === 0 ? 'bg-primary-500' : 'bg-gray-300'
              }`}
            />
            {index < events.length - 1 && <div className="h-full w-0.5 bg-gray-200 mt-1" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900">{event.action}</p>
              <span className="text-sm text-gray-500">by {event.user}</span>
            </div>
            <p className="text-sm text-gray-500">{new Date(event.timestamp).toLocaleString()}</p>
            {event.details && <p className="text-sm text-gray-500 mt-1">{event.details}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}