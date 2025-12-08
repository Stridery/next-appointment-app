"use client";

import {
  Avatar,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
  NavbarContent,
} from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import supabase from "@/src/services/supabase";
import styled from "styled-components";
import SignUpButton from "../../../app/components/Auth/SignUpButton";
import ProfileModal from "../ProfileModal";

const CustomAvatar = styled.div`
  .transition-opacity {
    transition: none !important;
    opacity: 100;
  }
`;

export default function ProfileDropdown() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // 从缓存加载头像
  const loadCachedAvatar = (userId) => {
    if (typeof window !== 'undefined') {
      const cacheKey = `avatar_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setAvatarUrl(cached);
      }
    }
  };

  // 保存头像到缓存
  const cacheAvatar = (userId, url) => {
    if (typeof window !== 'undefined' && url) {
      const cacheKey = `avatar_${userId}`;
      localStorage.setItem(cacheKey, url);
    }
  };

  // Check current session
  const getSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
    
    // 获取用户头像
    if (session) {
      // 先从缓存加载，立即显示
      loadCachedAvatar(session.user.id);
      // 然后从数据库更新
      loadUserAvatar(session.user.id);
    }
  };

  // 从 profiles 表获取用户头像
  const loadUserAvatar = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();
    
    if (data && data.avatar_url) {
      setAvatarUrl(data.avatar_url);
      // 更新缓存
      cacheAvatar(userId, data.avatar_url);
    }
  };

  useEffect(() => {
    getSession();
    setIsClient(true);
  }, []);

  const handleLogOutClick = () => {
    supabase.auth.signOut();
    setSession(null);
    setAvatarUrl(null);
    
    // 清除缓存
    if (session && typeof window !== 'undefined') {
      const cacheKey = `avatar_${session.user.id}`;
      localStorage.removeItem(cacheKey);
    }
    
    if (isClient) {
      router.push("/");
    }
  };

  const handleProfileUpdated = (updatedData) => {
    // 如果更新了头像
    if (updatedData.avatar_url) {
      setAvatarUrl(updatedData.avatar_url);
      
      // 更新缓存
      if (session) {
        cacheAvatar(session.user.id, updatedData.avatar_url);
      }
    }
  };

  return (
    <NavbarContent as="div" justify="end" style={{ flexGrow: 0 }}>
      <Dropdown placement="bottom-end">
        <DropdownTrigger>
          <CustomAvatar>
            {session ? (
              <Avatar
                isBordered
                showFallback
                as="button"
                name={session.user.email}
                size="sm"
                src={avatarUrl || `https://avatar.iran.liara.run/public/girl?username=${session.user.id}`}
              />
            ) : (
              <SignUpButton />
            )}
          </CustomAvatar>
        </DropdownTrigger>
        <DropdownMenu aria-label="Profile Actions" variant="flat">
          <DropdownSection showDivider>
            <DropdownItem key="sign-in" className="h-14 gap-2" href="/account">
              <p className="font-semibold">Signed in as</p>
              <p className="font-semibold">
                {session ? session.user.email : null}
              </p>
            </DropdownItem>
            <DropdownItem key="finder">Finder</DropdownItem>
            <DropdownItem key="provider">Provider</DropdownItem>
            <DropdownItem key="schedule">Scheduler</DropdownItem>
            <DropdownItem 
              key="profile"
              onClick={() => setIsProfileModalOpen(true)}
            >
              Profile
            </DropdownItem>
          </DropdownSection>
          <DropdownSection title="Services" showDivider>
            <DropdownItem 
              key="membership"
              onClick={() => router.push('/payment/membership')}
              description="Manage your membership"
            >
              Membership
            </DropdownItem>
            <DropdownItem 
              key="advertising"
              onClick={() => router.push('/payment/advertising')}
              description="Manage advertising campaigns"
            >
              Advertising
            </DropdownItem>
          </DropdownSection>
          <DropdownSection title="Help" showDivider>
            <DropdownItem key="help_and_feedback">Help & feedback</DropdownItem>
          </DropdownSection>
          <DropdownSection>
            <DropdownItem
              key="logout"
              color="danger"
              className="text-danger"
              onClick={handleLogOutClick}
            >
              Log out
            </DropdownItem>
          </DropdownSection>
        </DropdownMenu>
      </Dropdown>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        session={session}
        onProfileUpdated={handleProfileUpdated}
      />
    </NavbarContent>
  );
}
