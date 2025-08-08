import { useComputed } from '@preact/signals';
import { 
  jsonData, 
  selectedFeature, 
  selectFeature, 
  deleteFeature, 
  openWizard 
} from '../lib/jsonStore';

interface FeatureItemProps {
  feature: any;
  type: 'weatherFeatures' | 'features';
  index: number;
}

function FeatureItem({ feature, type, index }: FeatureItemProps) {
  const isSelected = useComputed(() => 
    selectedFeature.value.type === type && selectedFeature.value.index === index
  );

  const handleClick = () => {
    selectFeature(type, index);
  };

  const handleEdit = (e: Event) => {
    e.stopPropagation();
    const featureType = type === 'weatherFeatures' ? 'weatherFeature' : 'feature';
    openWizard('edit', featureType, index);
  };

  const handleDelete = (e: Event) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this feature?')) {
      deleteFeature(type, index);
    }
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
      className={`feature-list-item ${isSelected.value ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="feature-info">
        <div className="feature-name">{featureName}</div>
        <div className="feature-details">
          {itemCount} item(s) • {presentationType}{exclusiveText}
        </div>
      </div>
      <div className="feature-actions">
        <button 
          className="btn small" 
          onClick={handleEdit}
        >
          Edit
        </button>
        <button 
          className="btn danger small" 
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

interface FeatureCategoryProps {
  title: string;
  type: 'weatherFeatures' | 'features';
  features: any[];
}

function FeatureCategory({ title, type, features }: FeatureCategoryProps) {
  return (
    <details open className="feature-category">
      <summary className="feature-category-header">{title}</summary>
      <div className="feature-category-content">
        {features.length === 0 ? (
          <div style={{ padding: '12px', color: 'var(--muted)', textAlign: 'center' }}>
            No {title.toLowerCase()} found
          </div>
        ) : (
          features.map((feature, index) => (
            <FeatureItem 
              key={index}
              feature={feature} 
              type={type} 
              index={index} 
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

  const handleCreateFeature = () => {
    openWizard('create', 'weatherFeature');
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files || []);
    const jsonFile = files.find(f => f.type === 'application/json' || f.name.endsWith('.json'));
    
    if (jsonFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          try {
            const data = JSON.parse(text);
            jsonData.value = data;
          } catch (error) {
            console.error('Invalid JSON file:', error);
          }
        }
      };
      reader.readAsText(jsonFile);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  return (
    <div>
      <div 
        className="dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <strong>Drop your JSON here</strong><br/>
        or click <span className="pill warn">Open JSON…</span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <button className="btn primary" onClick={handleCreateFeature}>
          🧙‍♂️ Create Feature
        </button>
      </div>

      <div className="feature-browser">
        <FeatureCategory 
          title="Weather Features"
          type="weatherFeatures"
          features={weatherFeatures.value}
        />
        <FeatureCategory 
          title="General Features" 
          type="features"
          features={generalFeatures.value}
        />
      </div>
    </div>
  );
}