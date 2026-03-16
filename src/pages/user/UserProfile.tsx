import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, MapPin, Mail, Phone, User as UserIcon, ShieldCheck } from 'lucide-react';

const UserProfile = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background p-4 sm:p-6">
            <div className="max-w-md mx-auto space-y-6">
                <Button variant="ghost" onClick={() => navigate('/user/dashboard')} className="pl-0 hover:bg-transparent">
                    <ArrowLeft className="w-5 h-5 mr-1" /> Back to Dashboard
                </Button>

                <div className="text-center mb-8">
                    <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                        <UserIcon className="w-10 h-10 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-muted-foreground capitalize flex items-center justify-center gap-1">
                        <ShieldCheck className="w-4 h-4" /> {user.role}
                    </p>
                </div>

                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-muted/30">
                        <h2 className="font-semibold text-sm uppercase text-muted-foreground">Personal Info</h2>
                    </div>
                    <div className="divide-y">
                        <div className="p-4 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Organization</p>
                                <p className="font-medium">{user.hatchery_name || 'AquaNexus'}</p>
                                {user.assigned_farms && user.assigned_farms.length > 0 && (
                                    <>
                                        <p className="text-xs text-muted-foreground mt-2">Farm Access</p>
                                        <p className="font-medium text-sm text-primary/80">
                                            {user.assigned_farms.join(', ')}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-4 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-medium">{user.email || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="p-4 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground">Phone</p>
                                <p className="font-medium">{user.phone || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
