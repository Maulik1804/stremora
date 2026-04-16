import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Film, Users, Search, Trash2, ShieldOff, Shield,
  ChevronLeft, ChevronRight, X, AlertTriangle, Eye, Calendar,
  UserCheck, Crown, User as UserIcon, ChevronDown, ChevronUp,
  List, LayoutList,
} from 'lucide-react';
import { adminService } from '../services/admin.service';
import { toast } from '../components/ui/Toast';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';
