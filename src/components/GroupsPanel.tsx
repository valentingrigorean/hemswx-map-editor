import { useComputed, useSignal } from '@preact/signals';
import { 
  jsonData, 
  selectedFeature, 
  selectFeature, 
  deleteFeature,
  moveFeatureCategory,
  moveFeatureToIndex
} from '../lib/jsonStore';
import { SUPPORTED_LANGUAGES } from '../lib/intl';

interface FeatureItemProps {
  feature: any;
  type: 'weatherFeatures' | 'features';
  index: number;
  rearrange: boolean;
}

function FeatureItem({ feature, type, index, rearrange }: FeatureItemProps) {
  const isSelected = useComputed(() => 
    selectedFeature.value.type === type && selectedFeature.value.index === index
  );
  const featureCount = useComputed(() =>
    type === 'weatherFeatures' 
      ? (jsonData.value.weatherFeatures || []).length 
      : (jsonData.value.features || []).length
  );
  const isDragOver = useSignal(false);
  const dragPosition = useSignal<'before' | 'after' | null>(null);

  // Compute translation status for this feature
  const translationStatus = useComputed(() => {
    const translationKeys: string[] = [];
    
    // Collect all translation keys from the feature (IDs only)
    if (feature.id?.trim()) translationKeys.push(feature.id);
    
    (feature.items || []).forEach((item: any) => {
      if (item.id?.trim()) translationKeys.push(item.id);
      if (item.legendDescription?.trim()) translationKeys.push(item.legendDescription);
    });
    
    const uniqueKeys = [...new Set(translationKeys)];
    
    if (uniqueKeys.length === 0) {
      return { percentage: 100, missingCount: 0, totalKeys: 0 };
    }
    
    let totalTranslations = 0;
    let completedTranslations = 0;
    
    uniqueKeys.forEach(key => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        totalTranslations++;
        const value = jsonData.value.intl?.[lang]?.[key];
        if (value && value.trim()) {
          completedTranslations++;
        }
      });
    });
    
    const percentage = totalTranslations > 0 ? Math.round((completedTranslations / totalTranslations) * 100) : 100;
    const missingCount = totalTranslations - completedTranslations;
    
    return { percentage, missingCount, totalKeys: uniqueKeys.length };
  });

  const handleClick = () => {
    selectFeature(type, index);
  };


  const handleDelete = (e: Event) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this feature?')) {
      deleteFeature(type, index);
    }
  };

  const handleMoveUp = (e: Event) => {
    e.stopPropagation();
    if (index <= 0) return;
    moveFeatureToIndex(type, index, type, index - 1);
  };

  const handleMoveDown = (e: Event) => {
    e.stopPropagation();
    const count = (type === 'weatherFeatures' ? jsonData.value.weatherFeatures : jsonData.value.features).length;
    if (index >= count - 1) return;
    moveFeatureToIndex(type, index, type, index + 1);
  };

  const handleMoveCategory = (e: Event) => {
    e.stopPropagation();
    const toType = type === 'weatherFeatures' ? 'features' : 'weatherFeatures';
    moveFeatureCategory(type, index, toType);
  };

  const itemCount = (feature.items || []).length;
  const presentationType = feature.presentation || 'single';
  const featureName = feature.name 
    || (presentationType === 'single' && feature.items?.[0]?.name) 
    || feature.id 
    || 'Unnamed Feature';
  const exclusiveText = feature.mutuallyExclusive ? ' • Exclusive' : '';

  return (
    <div 
      className={`feature-list-item relative ${isSelected.value ? 'selected' : ''} ${isDragOver.value ? 'ring-1 ring-blue-500' : ''}`}
      onClick={handleClick}
      draggable={rearrange}
      onDragStart={(e) => {
        if (!rearrange) return;
        const payload = JSON.stringify({ kind: 'feature', type, index });
        e.dataTransfer.setData('application/x-feature', payload);
        // Also set text/plain for visibility in dev tools (not relied upon)
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        if (!rearrange) return;
        const types = Array.from(e.dataTransfer?.types || []);
        if (!types.includes('application/x-feature')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        isDragOver.value = true;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        dragPosition.value = before ? 'before' : 'after';
      }}
      onDragLeave={() => { isDragOver.value = false; dragPosition.value = null; }}
      onDrop={(e) => {
        if (!rearrange) return;
        e.preventDefault();
        isDragOver.value = false;
        const pos = dragPosition.value;
        dragPosition.value = null;
        const data = e.dataTransfer.getData('application/x-feature') || e.dataTransfer.getData('text/plain');
        if (!data) return;
        try {
          const parsed = JSON.parse(data) as { kind: string; type: 'weatherFeatures' | 'features'; index: number };
          if (parsed.kind !== 'feature') return;
          const targetIndex = pos === 'after' ? index + 1 : index;
          moveFeatureToIndex(parsed.type, parsed.index, type, targetIndex);
        } catch {}
      }}
    >
      {isDragOver.value && dragPosition.value === 'before' && (
        <div className="absolute -top-[1px] left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
      )}
      <div className="feature-info">
        <div className="feature-name">{featureName}</div>
        <div className="feature-details">
          {itemCount} item(s) • {presentationType}{exclusiveText}
        </div>
        {translationStatus.value.totalKeys > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-slate-400">i18n:</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              translationStatus.value.percentage === 100 
                ? 'bg-green-600 text-white' 
                : translationStatus.value.percentage > 50 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-red-600 text-white'
            }`}>
              {translationStatus.value.percentage}%
            </span>
            {translationStatus.value.missingCount > 0 && (
              <span className="text-xs text-orange-400">
                ({translationStatus.value.missingCount} missing)
              </span>
            )}
          </div>
        )}
      </div>
      <div className="feature-actions flex gap-1">
        {rearrange && (
          <>
            <button className="btn small" onClick={handleMoveUp} disabled={index === 0} title="Move up">↑</button>
            <button className="btn small" onClick={handleMoveDown} disabled={index >= featureCount.value - 1} title="Move down">↓</button>
            <button className="btn ghost small" onClick={handleMoveCategory} title={type === 'weatherFeatures' ? 'Move to General' : 'Move to Weather'}>
              {type === 'weatherFeatures' ? 'To General' : 'To Weather'}
            </button>
          </>
        )}
        <button 
          className="btn danger small" 
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
      {isDragOver.value && dragPosition.value === 'after' && (
        <div className="absolute -bottom-[1px] left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
      )}
    </div>
  );
}

interface FeatureCategoryProps {
  title: string;
  type: 'weatherFeatures' | 'features';
  features: any[];
  rearrange: boolean;
}

function FeatureCategory({ title, type, features, rearrange }: FeatureCategoryProps) {
  const isDragOverList = useSignal(false);
  return (
    <details open className={`feature-category ${isDragOverList.value ? 'ring-1 ring-blue-700 rounded' : ''}`}
      onDragOver={(e) => {
        if (!rearrange) return;
        const types = Array.from(e.dataTransfer?.types || []);
        if (!types.includes('application/x-feature')) return;
        e.preventDefault();
        isDragOverList.value = true;
      }}
      onDragLeave={() => { isDragOverList.value = false; }}
      onDrop={(e) => {
        if (!rearrange) return;
        e.preventDefault();
        isDragOverList.value = false;
        const data = e.dataTransfer.getData('application/x-feature') || e.dataTransfer.getData('text/plain');
        if (!data) return;
        try {
          const parsed = JSON.parse(data) as { kind: string; type: 'weatherFeatures' | 'features'; index: number };
          if (parsed.kind !== 'feature') return;
          // Drop on empty space of a category: append to end of that category
          const count = (type === 'weatherFeatures' ? jsonData.value.weatherFeatures : jsonData.value.features).length;
          moveFeatureToIndex(parsed.type, parsed.index, type, count);
        } catch {}
      }}
    >
      <summary className="feature-category-header">{title}</summary>
      <div className="feature-category-content">
        {features.length === 0 ? (
          <div className="p-3 text-slate-500 text-center">
            No {title.toLowerCase()} found
          </div>
        ) : (
          features.map((feature, index) => (
            <FeatureItem 
              key={index}
              feature={feature} 
              type={type} 
              index={index}
              rearrange={rearrange}
            />
          ))
        )}
      </div>
    </details>
  );
}

export default function GroupsPanel() {
  const weatherFeatures = useComputed(() => jsonData.value.weatherFeatures || []);
  const generalFeatures = useComputed(() => jsonData.value.features || []);
  const rearrangeMode = useSignal(false);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-400">Features</div>
        <button
          className={`btn tiny ${rearrangeMode.value ? 'success' : 'ghost'}`}
          onClick={() => rearrangeMode.value = !rearrangeMode.value}
          title="Toggle rearrange mode"
        >
          {rearrangeMode.value ? 'Done' : 'Rearrange'}
        </button>
      </div>
      <div className="feature-browser flex-1 overflow-auto">
        <FeatureCategory 
          title="Weather Features"
          type="weatherFeatures"
          features={weatherFeatures.value}
          rearrange={rearrangeMode.value}
        />
        <FeatureCategory 
          title="General Features" 
          type="features"
          features={generalFeatures.value}
          rearrange={rearrangeMode.value}
        />
      </div>
    </div>
  );
}
