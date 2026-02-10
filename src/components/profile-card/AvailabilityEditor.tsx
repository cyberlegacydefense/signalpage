'use client';

import { useState } from 'react';
import { Select, Input, Badge } from '@/components/ui';
import type { Availability, AvailabilityStatus, StartDate } from '@/types';
import { AVAILABILITY_STATUS_OPTIONS, START_DATE_OPTIONS } from '@/types';

interface AvailabilityEditorProps {
  availability: Partial<Availability>;
  onChange: (availability: Partial<Availability>) => void;
}

export function AvailabilityEditor({ availability, onChange }: AvailabilityEditorProps) {
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const updateField = <K extends keyof Availability>(field: K, value: Availability[K]) => {
    onChange({ ...availability, [field]: value });
  };

  const addRole = () => {
    if (!newRole.trim()) return;
    const roles = availability.roles || [];
    if (!roles.includes(newRole.trim())) {
      updateField('roles', [...roles, newRole.trim()]);
    }
    setNewRole('');
  };

  const removeRole = (role: string) => {
    updateField('roles', (availability.roles || []).filter((r) => r !== role));
  };

  const addLocation = () => {
    if (!newLocation.trim()) return;
    const locations = availability.locations || [];
    if (!locations.includes(newLocation.trim())) {
      updateField('locations', [...locations, newLocation.trim()]);
    }
    setNewLocation('');
  };

  const removeLocation = (location: string) => {
    updateField('locations', (availability.locations || []).filter((l) => l !== location));
  };

  const getStatusBadgeVariant = (status?: AvailabilityStatus) => {
    switch (status) {
      case 'actively_looking':
        return 'success';
      case 'open':
        return 'primary';
      case 'not_looking':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4">
      <Select
        label="Availability Status"
        value={availability.status || ''}
        onChange={(e) => updateField('status', e.target.value as AvailabilityStatus)}
        options={[
          { value: '', label: 'Select status...' },
          ...AVAILABILITY_STATUS_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
        ]}
      />

      {availability.status && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Current status:</span>
          <Badge variant={getStatusBadgeVariant(availability.status)}>
            {AVAILABILITY_STATUS_OPTIONS.find((o) => o.value === availability.status)?.label}
          </Badge>
        </div>
      )}

      {/* Roles */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Roles You&apos;re Looking For
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., Senior PM, Director of Product"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRole();
              }
            }}
          />
          <button
            type="button"
            onClick={addRole}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {(availability.roles?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {availability.roles?.map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
              >
                {role}
                <button
                  type="button"
                  onClick={() => removeRole(role)}
                  className="ml-1 hover:text-blue-900"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Preferred Locations
        </label>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., SF Bay Area, Remote, NYC"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLocation();
              }
            }}
          />
          <button
            type="button"
            onClick={addLocation}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {(availability.locations?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            {availability.locations?.map((location) => (
              <span
                key={location}
                className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700"
              >
                {location}
                <button
                  type="button"
                  onClick={() => removeLocation(location)}
                  className="ml-1 hover:text-green-900"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Start Date */}
      <Select
        label="When Can You Start?"
        value={availability.start_date || ''}
        onChange={(e) => updateField('start_date', e.target.value as StartDate)}
        options={[
          { value: '', label: 'Select start date...' },
          ...START_DATE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          })),
        ]}
      />
    </div>
  );
}
