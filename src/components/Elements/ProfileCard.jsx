import React from "react";
import { days } from "./Calendar";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Avatar,
  Button,
} from "@nextui-org/react";

export default function ProfileCard({ profile }) {
  const [isFollowed, setIsFollowed] = React.useState(false);

  // Use avatar_url if exists, otherwise use default avatar
  const avatarSrc = profile.avatar_url || `https://avatar.iran.liara.run/public/girl?username=${profile.name}`;

  return (
    <Card className="w-full mb-4">
      <CardHeader className="justify-between">
        <div className="flex gap-5">
          <Avatar
            isBordered
            radius="full"
            size="md"
            // src={`https://avatar.iran.liara.run/public/girl?username=${profile.name}`}
            // src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${profile.name}&scale=120&skinColor=f2d3b1,ecad80&mouth=variant01,variant23,variant27,variant16`}
            src={avatarSrc || `https://api.dicebear.com/9.x/adventurer/svg?seed=${profile.name}&scale=120&skinColor=f2d3b1,ecad80&mouth=variant01,variant23,variant27,variant16`}
          />
          <div className="flex flex-col gap-1 items-start justify-center">
            <h4 className="text-small font-semibold leading-none text-default-600">
              {profile.name}
            </h4>
            <h5 className="text-small tracking-tight text-default-400">
              @{profile.name}
            </h5>
          </div>
        </div>
        {/* <Button
          className={isFollowed ? "bg-transparent text-foreground border-default-200" : ""}
          color="primary"
          radius="full"
          size="sm"
          variant={isFollowed ? "bordered" : "solid"}
          onPress={() => setIsFollowed(!isFollowed)}
        >
          {isFollowed ? "Unfollow" : "Follow"}
        </Button> */}
      </CardHeader>
      <CardBody className="px-3 py-0 text-small text-default-400">
        <p>{profile.intro}</p>
      </CardBody>
      <CardFooter className="gap-3 flex-col items-start">
        {/* Calendly Link */}
        {profile.calendly_url && (
          <div className="flex gap-2 items-center w-full">
            <svg 
              className="w-4 h-4 text-blue-500 flex-shrink-0" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <a 
              href={profile.calendly_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-small text-blue-500 hover:text-blue-700 hover:underline break-all"
            >
              {profile.calendly_url}
            </a>
          </div>
        )}

        {/* Availabilities */}
        <div className="flex gap-1 items-center w-full">
          <p className="font-semibold text-default-400 text-small">
            Availabilities:{" "}
          </p>
          <div>
            <p className=" text-default-400 text-small">
              {profile.availabilities && Array.isArray(profile.availabilities) ? (
                profile.availabilities.map((a) => (
                  <Button size="sm" variant="bordered" className="me-1" key={a}>
                    {days[a]}
                  </Button>
                ))
              ) : (
                <span className="text-xs text-gray-500">Not set</span>
              )}
            </p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
