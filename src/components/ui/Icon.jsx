import {
  // Navigation
  Home,
  Gamepad2,
  BarChart3,
  History,
  Settings,
  Sun,
  Moon,

  // Sensors
  Droplets,
  Droplet,
  Thermometer,
  Zap,
  FlaskConical,

  // Status/Alerts
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Check,
  X,

  // Actions
  RefreshCw,
  Save,
  Trash2,
  PenLine,
  Printer,
  Search,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,

  // Hardware/Control
  Shield,
  Cog,
  Volume2,
  VolumeX,
  Megaphone,
  Camera,
  Radio,
  Wifi,
  WifiOff,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,

  // Data/Analytics
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Bot,
  ClipboardList,
  FileText,
  Calendar,
  Clock,

  // Environmental
  CloudRain,
  Snowflake,
  ThermometerSun,
  Wind,

  // Bird Detection
  Bird,
  Eye,
  EyeOff,
  Target,
  Crosshair,

  // Misc
  Loader2,
  ExternalLink,
  Link,
  Download,
  Upload,
  Filter,
  SlidersHorizontal,
  MoreVertical,
  MoreHorizontal,
  Menu,
  BookOpen,
  Sprout,
  Leaf,
} from 'lucide-react';

// Icon mapping for easy reference
export const Icons = {
  // Navigation
  Home,
  Gamepad2,
  BarChart3,
  History,
  Settings,
  Sun,
  Moon,

  // Sensors
  Droplets,
  Droplet,
  Thermometer,
  Zap,
  FlaskConical,

  // Status/Alerts
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Check,
  X,

  // Actions
  RefreshCw,
  Save,
  Trash2,
  PenLine,
  Printer,
  Search,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,

  // Hardware/Control
  Shield,
  Cog,
  Volume2,
  VolumeX,
  Megaphone,
  Camera,
  Radio,
  Wifi,
  WifiOff,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,

  // Data/Analytics
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Bot,
  ClipboardList,
  FileText,
  Calendar,
  Clock,

  // Environmental
  CloudRain,
  Snowflake,
  ThermometerSun,
  Wind,

  // Bird Detection
  Bird,
  Eye,
  EyeOff,
  Target,
  Crosshair,

  // Misc
  Loader2,
  ExternalLink,
  Link,
  Download,
  Upload,
  Filter,
  SlidersHorizontal,
  MoreVertical,
  MoreHorizontal,
  Menu,
  BookOpen,
  Sprout,
  Leaf,
};

// Reusable Icon component with consistent sizing
export const Icon = ({ name, size = 20, className = '', strokeWidth = 2, ...props }) => {
  const LucideIcon = Icons[name];
  if (!LucideIcon) {
    console.warn(`Icon "${name}" not found in Icons mapping`);
    return null;
  }
  return (
    <LucideIcon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      {...props}
    />
  );
};

// Export individual icons for direct import
export {
  // Navigation
  Home,
  Gamepad2,
  BarChart3,
  History,
  Settings,
  Sun,
  Moon,

  // Sensors
  Droplets,
  Droplet,
  Thermometer,
  Zap,
  FlaskConical,

  // Status/Alerts
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  Check,
  X,

  // Actions
  RefreshCw,
  Save,
  Trash2,
  PenLine,
  Printer,
  Search,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ArrowRight,
  ArrowLeft,

  // Hardware/Control
  Shield,
  Cog,
  Volume2,
  VolumeX,
  Megaphone,
  Camera,
  Radio,
  Wifi,
  WifiOff,
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,

  // Data/Analytics
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Bot,
  ClipboardList,
  FileText,
  Calendar,
  Clock,

  // Environmental
  CloudRain,
  Snowflake,
  ThermometerSun,
  Wind,

  // Bird Detection
  Bird,
  Eye,
  EyeOff,
  Target,
  Crosshair,

  // Misc
  Loader2,
  ExternalLink,
  Link,
  Download,
  Upload,
  Filter,
  SlidersHorizontal,
  MoreVertical,
  MoreHorizontal,
  Menu,
  BookOpen,
  Sprout,
  Leaf,
};

export default Icon;
