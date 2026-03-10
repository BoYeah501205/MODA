/**
 * SequenceBuilderHeader.jsx
 * Page header with back button, project info, step indicator, and save button
 */

const { useMemo } = React;

function SequenceBuilderHeader({
  projectName,
  currentStep,
  moduleCount,
  hasUnsavedChanges,
  isSaving,
  onBack,
  onSave
}) {
  // Workflow steps
  const steps = [
    { id: 'setup', label: 'Setup' },
    { id: 'generate', label: 'Generate' },
    { id: 'sequence', label: 'Sequence' },
    { id: 'tags', label: 'Tags' },
    { id: 'review', label: 'Review' },
  ];

  // Get current step index
  const currentStepIndex = useMemo(() => {
    return steps.findIndex(s => s.id === currentStep);
  }, [currentStep, steps]);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Back button and title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="Back to project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Production Sequence Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {projectName}
              {moduleCount > 0 && (
                <span className="ml-2 text-gray-400">
                  ({moduleCount} module{moduleCount !== 1 ? 's' : ''})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Step indicator */}
        <div className="hidden md:flex items-center gap-1">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div key={step.id} className="flex items-center">
                {/* Step circle */}
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                
                {/* Step label */}
                <span
                  className={`ml-1.5 text-xs font-medium ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Right: Save button */}
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="3" />
              </svg>
              Unsaved changes
            </span>
          )}
          
          <button
            onClick={onSave}
            disabled={isSaving || !hasUnsavedChanges}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile step indicator */}
      <div className="md:hidden mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span className="font-medium text-blue-600">
            {steps[currentStepIndex]?.label}
          </span>
        </div>
        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.SequenceBuilderHeader = SequenceBuilderHeader;
