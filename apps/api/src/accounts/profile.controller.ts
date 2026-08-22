import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ProfileService } from "./profile.service";

class ProfileDto {
  @IsString() @MinLength(2) @MaxLength(60) firstName: string;
  @IsString() @MinLength(2) @MaxLength(60) lastName: string;
}

class AddressDto {
  @IsString() @MinLength(1) @MaxLength(40) label: string;
  @IsString() @MinLength(2) @MaxLength(120) recipient: string;
  @IsString() @MinLength(2) @MaxLength(160) line1: string;
  @IsOptional() @IsString() @MaxLength(160) line2?: string;
  @IsString() @MinLength(2) @MaxLength(100) city: string;
  @IsOptional() @IsString() @MaxLength(100) county?: string;
  @IsString() @Matches(/^[A-Za-z0-9 ]{3,10}$/) postcode: string;
  @IsOptional() @IsString() @Length(2, 2) countryCode?: string;
}

class FavouriteDto {
  @IsString() productId: string;
}

@ApiTags("account profile")
@Controller("account")
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get("profile") profileDetails(@CurrentUser() user: AuthenticatedUser) {
    return this.profile.get(user);
  }
  @Patch("profile") updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: ProfileDto,
  ) {
    return this.profile.update(user, body);
  }
  @Post("addresses") addAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: AddressDto,
  ) {
    return this.profile.addAddress(user, body);
  }
  @Patch("addresses/:id") updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: AddressDto,
  ) {
    return this.profile.updateAddress(user, id, body);
  }
  @Delete("addresses/:id") removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.profile.removeAddress(user, id);
  }
  @Get("favourites") favourites(@CurrentUser() user: AuthenticatedUser) {
    return this.profile.favourites(user);
  }
  @Post("favourites") addFavourite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: FavouriteDto,
  ) {
    return this.profile.addFavourite(user, body.productId);
  }
  @Delete("favourites/:productId") removeFavourite(
    @CurrentUser() user: AuthenticatedUser,
    @Param("productId") productId: string,
  ) {
    return this.profile.removeFavourite(user, productId);
  }
}
